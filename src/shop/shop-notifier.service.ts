import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Order, OrderItem, OrderStatus } from '../../generated/prisma';
import { ConfigService } from '../config/config.service';
import { ShopSettingsService } from './shop-settings.service';

export type OrderWithItems = Order & { items: OrderItem[] };

/**
 * Une ligne de commande dont le decompte au webhook a fait passer le stock
 * d'une taille geree sous zero : deux paiements confirmes concurrents ont
 * franchi ensemble la verification faite au devis, qui ne reserve rien.
 * `available` est le stock qu'il restait juste avant ce decompte.
 */
export interface StockShortfallLine {
  productId: number;
  productName: string;
  size: string;
  sizeId: number;
  requested: number;
  available: number;
}

/**
 * Statuts dont l'atteinte previent le client par mail.
 *
 * Arbitrage PO du 2026-08-07. Sont volontairement absents :
 *
 *   SENT_TO_MERCHANT — lot interne de transmission a l'atelier. Le libelle ne
 *                      veut rien dire pour un acheteur, et la bascule est faite
 *                      en masse : un envoi par commande partirait d'un coup.
 *   IN_PRODUCTION    — rassurant sur un delai annonce jusqu'a 25 jours ouvres,
 *                      mais du confort. Trace en US non planifiee.
 *   DELIVERED        — arrive apres l'information qu'il porte : le client sait
 *                      qu'il a recu son colis.
 */
export const CLIENT_NOTIFIED_STATUSES = ['SHIPPED', 'CANCELLED', 'REFUNDED'] as const;

export type ClientNotifiedStatus = (typeof CLIENT_NOTIFIED_STATUSES)[number];

export function isClientNotifiedStatus(status: OrderStatus): status is ClientNotifiedStatus {
  return (CLIENT_NOTIFIED_STATUSES as readonly string[]).includes(status);
}

@Injectable()
export class ShopNotifierService {
  private readonly logger = new Logger(ShopNotifierService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: ShopSettingsService,
  ) {}

  /**
   * Notifie une nouvelle commande payee sur trois canaux independants :
   * mail equipe, mail de confirmation au client (obligation legale, art.
   * L221-13 C. conso) et Discord. Chaque canal a son propre try/catch : un
   * canal en echec n'empeche pas les autres. Le mail client est le plus
   * important des trois (c'est la seule confirmation ecrite du client sur
   * un support durable) : son echec est journalise en `error` pour permettre
   * un renvoi manuel.
   *
   * Semantique du throw : la commande est deja actee comme payee avant
   * l'appel (cf. ShopWebhookService.markPaid) et l'appelant capture
   * systematiquement l'exception pour ne jamais faire echouer le webhook
   * Stripe. On ne leve donc une erreur que si les TROIS canaux ont echoue,
   * ce qui signalerait une panne generale (SMTP + Discord tous les deux
   * indisponibles) meritant une alerte forte plutot qu'un simple warn.
   * Avant l'ajout du mail client, la regle portait sur les deux seuls
   * canaux existants (equipe + Discord) ; elle est etendue a l'identique.
   */
  async notifyNewOrder(order: OrderWithItems): Promise<void> {
    const results = { teamEmail: false, customerEmail: false, discord: false };

    try {
      await this.sendTeamEmail(order);
      results.teamEmail = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Mail equipe pour la commande ${order.reference} en echec: ${message}`);
    }

    try {
      await this.sendCustomerEmail(order);
      results.customerEmail = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Mail de confirmation client pour la commande ${order.reference} en echec: ${message}`,
      );
    }

    try {
      await this.sendDiscord(order);
      results.discord = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook Discord pour ${order.reference} en echec: ${message}`);
    }

    const failedChannels = Object.entries(results)
      .filter(([, ok]) => !ok)
      .map(([channel]) => channel);

    if (failedChannels.length === 3) {
      throw new Error(`Aucune notification envoyee pour la commande ${order.reference}`);
    }
    if (failedChannels.length > 0) {
      this.logger.warn(
        `Commande ${order.reference} enregistree mais notification(s) en echec : ${failedChannels.join(', ')}`,
      );
    }
  }

  /**
   * Previent le client que sa commande a change d'etape.
   *
   * Le declencheur est la TRANSITION, jamais l'etat d'arrivee. Sans cette
   * distinction, tout enregistrement d'une commande deja expediee renverrait le
   * mail d'expedition — or c'est le cas nominal du back-office : on rouvre une
   * commande pour corriger une note ou completer un numero de suivi.
   *
   * Retourne `false` sans rien envoyer, et sans erreur, quand la transition ne
   * porte pas de mail : c'est la situation ordinaire, pas une anomalie.
   *
   * Semantique du throw : l'appelant a deja ecrit le statut en base et capture
   * l'exception. Un mail perdu ne doit jamais annuler un changement d'etape
   * decide par un operateur — il est journalise pour permettre une reprise.
   */
  async notifyStatusChange(order: OrderWithItems, previousStatus: OrderStatus): Promise<boolean> {
    if (order.status === previousStatus) {
      return false;
    }
    if (!isClientNotifiedStatus(order.status)) {
      return false;
    }
    // Une commande jamais payee n'a pas de client a prevenir : annuler un
    // panier abandonne ne regarde que nous. Les PENDING sont d'ailleurs purges
    // a 7 jours par ShopRetentionService, cette bascule reste marginale.
    if (order.status === 'CANCELLED' && previousStatus === 'PENDING') {
      return false;
    }
    if (!order.customerEmail) {
      this.logger.warn(
        `Commande ${order.reference} passee en ${order.status} sans adresse client : aucun mail envoye`,
      );
      return false;
    }

    const { transporter, user } = await this.createTransporter();

    await transporter.sendMail({
      from: user,
      to: order.customerEmail,
      subject: buildStatusChangeSubject(order, order.status),
      text: buildStatusChangeText(order, order.status),
      html: buildStatusChangeHtml(order, order.status),
    });

    return true;
  }

  /**
   * Alerte l'equipe d'une survente residuelle : le decompte au webhook a fait
   * passer le stock d'au moins une taille geree sous zero. La commande reste
   * due — le client a paye — mais l'equipe doit savoir qu'elle devra gerer un
   * manque a la production.
   *
   * Mêmes deux canaux internes que `notifyNewOrder` (mail equipe, Discord),
   * pas de mail client : ce n'est pas son information, sa commande n'est pas
   * remise en cause. Semantique du throw identique à `notifyNewOrder` : le
   * stock est deja decompte avant l'appel, l'appelant capture systematiquement
   * l'exception pour ne jamais faire echouer le webhook Stripe ; elle ne sert
   * qu'a signaler que les deux canaux sont tombes ensemble.
   */
  async notifyStockShortfall(
    order: OrderWithItems,
    shortfalls: StockShortfallLine[],
  ): Promise<void> {
    const results = { teamEmail: false, discord: false };

    try {
      await this.sendStockShortfallTeamEmail(order, shortfalls);
      results.teamEmail = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Mail équipe de rupture de stock pour la commande ${order.reference} en échec: ${message}`,
      );
    }

    try {
      await this.postToDiscordWebhook(buildStockShortfallDiscordEmbed(order, shortfalls));
      results.discord = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Webhook Discord de rupture de stock pour la commande ${order.reference} en échec: ${message}`,
      );
    }

    if (!results.teamEmail && !results.discord) {
      throw new Error(
        `Aucune alerte de rupture de stock envoyée pour la commande ${order.reference}`,
      );
    }
  }

  /**
   * Cree un transporteur SMTP a partir de la config stockee en base.
   * Partage entre le mail equipe et le mail client : les deux canaux mail
   * echouent ensemble si le SMTP est mal configure, ce qui est le
   * comportement attendu (meme infrastructure d'envoi).
   */
  private async createTransporter(): Promise<{
    transporter: nodemailer.Transporter;
    user: string;
  }> {
    const [host, port, user, pass] = await Promise.all([
      this.config.getValue('contact_smtp_host'),
      this.config.getValue('contact_smtp_port'),
      this.config.getValue('contact_smtp_user'),
      this.config.getValue('contact_smtp_pass'),
    ]);

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing in database');
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number.parseInt(port || '587', 10),
      secure: port === '465',
      auth: { user, pass },
    });
    return { transporter, user };
  }

  private async sendTeamEmail(order: OrderWithItems): Promise<void> {
    const [{ transporter, user }, legacyRecipient, settings] = await Promise.all([
      this.createTransporter(),
      this.config.getValue('shop_team_email'),
      this.settings.get(),
    ]);
    // Le destinataire est desormais un reglage boutique ; `shop_team_email`
    // reste consulte en repli pour les bases anterieures a la migration.
    const to = settings.ordersNotifyEmail || legacyRecipient || user;

    await transporter.sendMail({
      from: user,
      to,
      subject: `Nouvelle commande boutique ${order.reference}`,
      text: buildOrderEmailText(order),
      html: buildOrderEmailHtml(order),
    });
  }

  private async sendCustomerEmail(order: OrderWithItems): Promise<void> {
    if (!order.customerEmail) {
      throw new Error('Adresse e-mail client manquante');
    }
    const { transporter, user } = await this.createTransporter();

    await transporter.sendMail({
      from: user,
      to: order.customerEmail,
      subject: `Confirmation de votre commande ${order.reference}`,
      text: buildCustomerOrderEmailText(order),
      html: buildCustomerOrderEmailHtml(order),
    });
  }

  private async sendDiscord(order: OrderWithItems): Promise<void> {
    await this.postToDiscordWebhook(buildOrderDiscordEmbed(order));
  }

  private async sendStockShortfallTeamEmail(
    order: OrderWithItems,
    shortfalls: StockShortfallLine[],
  ): Promise<void> {
    const [{ transporter, user }, legacyRecipient, settings] = await Promise.all([
      this.createTransporter(),
      this.config.getValue('shop_team_email'),
      this.settings.get(),
    ]);
    const to = settings.ordersNotifyEmail || legacyRecipient || user;

    await transporter.sendMail({
      from: user,
      to,
      subject: `Survente détectée — commande ${order.reference}`,
      text: buildStockShortfallEmailText(order, shortfalls),
      html: buildStockShortfallEmailHtml(order, shortfalls),
    });
  }

  /** Poste un embed sur le webhook Discord de la boutique. Partagé entre la notification de commande et l'alerte de rupture de stock. */
  private async postToDiscordWebhook(embed: DiscordEmbed): Promise<void> {
    const webhookUrl = await this.config.getValue('shop_discord_webhook');
    if (!webhookUrl) {
      throw new Error('Discord webhook not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Discord webhook responded ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Pure helper functions (no DI)

export function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

interface StripeAddress {
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export function formatAddress(shippingAddress: unknown): string {
  const address = (shippingAddress as { address?: StripeAddress } | null)?.address;
  if (!address?.line1) {
    return 'Adresse non renseignée';
  }
  const locality = [address.postal_code, address.city].filter(Boolean).join(' ');
  return [address.line1, address.line2, locality, address.country].filter(Boolean).join(', ');
}

/**
 * Decrit une ligne de commande. Le flocage y figure explicitement : c'est
 * l'information que l'equipe recopie pour le fabricant, elle ne doit jamais
 * etre noyee.
 */
export function describeItem(item: OrderItem): string {
  const flocking = item.flockingText ? ` — flocage « ${item.flockingText} »` : ' — sans flocage';
  return `${item.productName} — taille ${item.size}${flocking} × ${item.quantity}`;
}

/**
 * Variante de `describeItem` pour le mail client : pas de tiret cadratin
 * (regle de style pour la copie client) et prix unitaire affiche, attendu
 * par l'information precontractuelle recapitulee (art. L221-13 C. conso).
 */
export function describeCustomerItem(item: OrderItem): string {
  const flocking = item.flockingText ? `flocage : « ${item.flockingText} »` : 'sans flocage';
  return `${item.productName}, taille ${item.size}, ${flocking}, quantité ${item.quantity}, prix unitaire ${formatEuros(item.unitPriceCents)} €`;
}

/**
 * URL publique du site, utilisee pour construire les liens legaux du mail
 * client. Pas de domaine en dur : `SHOP_PUBLIC_URL` prevaut si definie,
 * sinon on derive l'origine de `SHOP_SUCCESS_URL` (deja utilisee par
 * StripeService pour la redirection post-paiement).
 */
export function getShopPublicOrigin(): string {
  const explicit = process.env.SHOP_PUBLIC_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  const successUrl = process.env.SHOP_SUCCESS_URL ?? 'http://localhost:4200/boutique/merci';
  try {
    return new URL(successUrl).origin;
  } catch {
    return 'http://localhost:4200';
  }
}

const deliveryDelayLogger = new Logger('ShopDeliveryDelay');

/**
 * Delai de livraison annonce au client, lu depuis `SHOP_DELIVERY_DELAY_TEXT`.
 *
 * Aucune donnee de ce type n'existe en base a ce jour, et le delai reel n'a pas
 * encore ete confirme par l'atelier. Le repli ne l'invente donc pas : il enonce
 * le delai suppletif de l'article L216-1 du code de la consommation, qui est
 * precisement celui qui s'applique quand aucun delai n'a ete convenu. Annoncer
 * une duree plus courte tiree de nulle part engagerait l'association sur une
 * promesse que personne n'a validee, et son depassement ouvrirait la resolution
 * de la vente.
 */
export function getDeliveryDelayText(): string {
  const configured = process.env.SHOP_DELIVERY_DELAY_TEXT?.trim();
  if (configured) {
    return configured;
  }
  deliveryDelayLogger.error(
    'SHOP_DELIVERY_DELAY_TEXT absente : le mail client annonce le delai legal de 30 jours ' +
      "(art. L216-1). Renseigner le delai reel de l'atelier avant l'ouverture de la boutique.",
  );
  return 'au plus tard 30 jours après la validation de votre commande (article L216-1 du Code de la consommation)';
}

export interface ShopLegalLinks {
  cgv: string;
  retractation: string;
  confidentialite: string;
}

export function buildLegalLinks(origin: string): ShopLegalLinks {
  return {
    cgv: `${origin}/conditions-generales-de-vente`,
    retractation: `${origin}/retractation`,
    confidentialite: `${origin}/politique-de-confidentialite`,
  };
}

type FlockingState = 'none' | 'all' | 'mixed';

function orderFlockingState(order: OrderWithItems): FlockingState {
  const flockedCount = order.items.filter((item) => !!item.flockingText).length;
  if (flockedCount === 0) return 'none';
  if (flockedCount === order.items.length) return 'all';
  return 'mixed';
}

/**
 * Le texte du droit de retractation doit etre juridiquement exact pour
 * CETTE commande : un maillot floque est un bien confectionne selon les
 * specifications du consommateur (art. L221-28 3° C. conso), exclu du
 * droit de retractation de 14 jours (art. L221-18 C. conso). Une commande
 * mixte doit distinguer les deux regimes plutot que d'annoncer un droit
 * uniforme qui serait faux pour une partie des articles.
 */
export function buildRetractationParagraph(order: OrderWithItems): string {
  const state = orderFlockingState(order);
  if (state === 'none') {
    return "Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.";
  }
  if (state === 'all') {
    return "Votre commande comporte uniquement des articles personnalisés (flocage). Conformément à l'article L221-28 3° du Code de la consommation, le droit de rétractation ne s'applique pas aux biens confectionnés selon vos spécifications ou nettement personnalisés : vous ne disposez donc pas d'un droit de rétractation sur cette commande.";
  }
  return "Votre commande comporte à la fois des articles standards et des articles personnalisés (flocage). Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours à compter de la réception pour exercer votre droit de rétractation sur les articles non personnalisés. Conformément à l'article L221-28 3° du même code, ce droit ne s'applique en revanche pas aux articles personnalisés (flocage).";
}

export function buildOrderEmailText(order: OrderWithItems): string {
  return [
    `Nouvelle commande ${order.reference}`,
    '',
    'Articles :',
    ...order.items.map((item) => `  - ${describeItem(item)}`),
    '',
    `Client   : ${order.customerName} <${order.customerEmail}>`,
    `Adresse  : ${formatAddress(order.shippingAddress)}`,
    `Sous-total : ${formatEuros(order.subtotalCents)} €`,
    `Port     : ${formatEuros(order.shippingCents)} €`,
    `Total    : ${formatEuros(order.totalCents)} €`,
  ].join('\n');
}

export function buildOrderEmailHtml(order: OrderWithItems): string {
  const row = (label: string, value: string): string =>
    `<tr><td style="padding:4px 12px 4px 0;"><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`;

  // escapeHtml sur chaque ligne : le flocage est une saisie client.
  const items = order.items.map((item) => `<li>${escapeHtml(describeItem(item))}</li>`).join('\n');

  return `<h2>Nouvelle commande ${escapeHtml(order.reference)}</h2>
<ul>
${items}
</ul>
<table>
${row('Client', `${order.customerName} <${order.customerEmail}>`)}
${row('Adresse', formatAddress(order.shippingAddress))}
${row('Sous-total', `${formatEuros(order.subtotalCents)} €`)}
${row('Port', `${formatEuros(order.shippingCents)} €`)}
${row('Total', `${formatEuros(order.totalCents)} €`)}
</table>`;
}

/**
 * Mail de confirmation envoye au client (art. L221-13 C. conso) : reprend
 * les informations precontractuelles sur un support durable, ce que le recu
 * Stripe seul ne fait pas. Version texte, cf. `buildCustomerOrderEmailHtml`
 * pour la version HTML.
 */
export function buildCustomerOrderEmailText(order: OrderWithItems): string {
  const links = buildLegalLinks(getShopPublicOrigin());

  return [
    `Bonjour ${order.customerName},`,
    '',
    `Nous vous confirmons la réception de votre commande ${order.reference}, réglée avec succès.`,
    '',
    'Détail de votre commande :',
    ...order.items.map((item) => `  - ${describeCustomerItem(item)}`),
    '',
    `Sous-total : ${formatEuros(order.subtotalCents)} €`,
    `Frais de port : ${formatEuros(order.shippingCents)} €`,
    `Total payé : ${formatEuros(order.totalCents)} €`,
    '',
    'Adresse de livraison :',
    formatAddress(order.shippingAddress),
    '',
    `Délai de livraison estimé : ${getDeliveryDelayText()}.`,
    '',
    'Droit de rétractation :',
    buildRetractationParagraph(order),
    '',
    'Garanties légales :',
    'Votre commande bénéficie de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) ainsi que de la garantie contre les vices cachés (articles 1641 et suivants du Code civil). En cas de défaut constaté, contactez-nous pour faire valoir vos droits.',
    '',
    'Pour en savoir plus :',
    `Conditions générales de vente : ${links.cgv}`,
    `Droit de rétractation (modalités et formulaire) : ${links.retractation}`,
    `Politique de confidentialité : ${links.confidentialite}`,
    '',
    'Merci de votre confiance,',
    "L'équipe Team Divergentes",
  ].join('\n');
}

/**
 * Version HTML du mail client. escapeHtml systematique sur les champs
 * saisis par le client (nom, flocage recopie via describeCustomerItem,
 * adresse) : ce sont des donnees non fiables injectees dans du HTML.
 */
export function buildCustomerOrderEmailHtml(order: OrderWithItems): string {
  const links = buildLegalLinks(getShopPublicOrigin());
  const row = (label: string, value: string): string =>
    `<tr><td style="padding:4px 12px 4px 0;"><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`;

  const items = order.items
    .map((item) => `<li>${escapeHtml(describeCustomerItem(item))}</li>`)
    .join('\n');

  return `<h2>Confirmation de votre commande ${escapeHtml(order.reference)}</h2>
<p>Bonjour ${escapeHtml(order.customerName)},</p>
<p>Nous vous confirmons la réception de votre commande, réglée avec succès.</p>
<h3>Détail de votre commande</h3>
<ul>
${items}
</ul>
<table>
${row('Sous-total', `${formatEuros(order.subtotalCents)} €`)}
${row('Frais de port', `${formatEuros(order.shippingCents)} €`)}
${row('Total payé', `${formatEuros(order.totalCents)} €`)}
${row('Adresse de livraison', formatAddress(order.shippingAddress))}
${row('Délai de livraison estimé', `${getDeliveryDelayText()}.`)}
</table>
<h3>Droit de rétractation</h3>
<p>${escapeHtml(buildRetractationParagraph(order))}</p>
<h3>Garanties légales</h3>
<p>Votre commande bénéficie de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) ainsi que de la garantie contre les vices cachés (articles 1641 et suivants du Code civil). En cas de défaut constaté, contactez-nous pour faire valoir vos droits.</p>
<h3>Pour en savoir plus</h3>
<ul>
<li><a href="${escapeHtml(links.cgv)}">Conditions générales de vente</a></li>
<li><a href="${escapeHtml(links.retractation)}">Droit de rétractation (modalités et formulaire)</a></li>
<li><a href="${escapeHtml(links.confidentialite)}">Politique de confidentialité</a></li>
</ul>
<p>Merci de votre confiance,<br>L'équipe Team Divergentes</p>`;
}

/**
 * Corps d'un mail de changement d'etape, avant rendu.
 *
 * Les versions texte et HTML sont produites a partir de CETTE structure et non
 * ecrites deux fois : le mail de confirmation a l'achat, lui, existe en deux
 * redactions paralleles, et rien n'empeche aujourd'hui l'une de deriver de
 * l'autre. On ne reproduit pas ce montage ici.
 */
export interface StatusChangeMessage {
  subject: string;
  paragraphs: string[];
  /** Recapitulatif en couples libelle / valeur. */
  rows: { label: string; value: string }[];
  /** Articles concernes, omis quand ils n'apportent rien au message. */
  items: string[];
  /** Rappel des liens CGV, retractation et confidentialite. */
  withLegalLinks: boolean;
}

export function buildStatusChangeMessage(
  order: OrderWithItems,
  status: ClientNotifiedStatus,
): StatusChangeMessage {
  if (status === 'SHIPPED') {
    return {
      subject: `Votre commande ${order.reference} a été expédiée`,
      paragraphs: [
        `Bonjour ${order.customerName},`,
        `Votre commande ${order.reference} vient de quitter nos ateliers.`,
        // Pas de date d'arrivee promise : le transporteur n'est pas nous, et un
        // engagement de delai a l'expedition est un engagement contractuel.
        order.trackingNumber
          ? 'Vous pouvez suivre son acheminement avec le numéro ci-dessous.'
          : "Le numéro de suivi n'est pas encore disponible ; votre colis est bien en route.",
        buildRetractationParagraph(order),
      ],
      rows: [
        ...(order.trackingNumber
          ? [{ label: 'Numéro de suivi', value: order.trackingNumber }]
          : []),
        { label: 'Adresse de livraison', value: formatAddress(order.shippingAddress) },
      ],
      items: order.items.map((item) => describeCustomerItem(item)),
      withLegalLinks: true,
    };
  }

  if (status === 'CANCELLED') {
    return {
      subject: `Annulation de votre commande ${order.reference}`,
      paragraphs: [
        `Bonjour ${order.customerName},`,
        `Votre commande ${order.reference} a été annulée et ne sera pas produite.`,
        `Le montant de ${formatEuros(order.totalCents)} € vous sera remboursé sur le moyen de paiement utilisé lors de l'achat. Un second message vous confirmera l'opération.`,
        'Si cette annulation vous surprend, écrivez-nous : nous reprendrons la commande avec vous.',
      ],
      rows: [{ label: 'Montant de la commande', value: `${formatEuros(order.totalCents)} €` }],
      items: order.items.map((item) => describeCustomerItem(item)),
      withLegalLinks: false,
    };
  }

  return {
    subject: `Remboursement de votre commande ${order.reference}`,
    paragraphs: [
      `Bonjour ${order.customerName},`,
      `Le remboursement de votre commande ${order.reference} a été effectué.`,
      // Aucun delai annonce : il depend de la banque du porteur, pas de nous.
      "Le délai d'apparition sur votre compte dépend de votre établissement bancaire.",
      "Si la somme n'apparaît pas au terme de ce délai, écrivez-nous et nous ferons le point avec vous.",
    ],
    rows: [{ label: 'Montant remboursé', value: `${formatEuros(order.totalCents)} €` }],
    items: [],
    withLegalLinks: false,
  };
}

export function buildStatusChangeSubject(
  order: OrderWithItems,
  status: ClientNotifiedStatus,
): string {
  return buildStatusChangeMessage(order, status).subject;
}

export function buildStatusChangeText(order: OrderWithItems, status: ClientNotifiedStatus): string {
  const message = buildStatusChangeMessage(order, status);
  const links = buildLegalLinks(getShopPublicOrigin());

  const lines = [...message.paragraphs.flatMap((paragraph) => [paragraph, ''])];

  if (message.items.length > 0) {
    lines.push('Détail de votre commande :', ...message.items.map((item) => `  - ${item}`), '');
  }
  for (const row of message.rows) {
    lines.push(`${row.label} : ${row.value}`);
  }
  if (message.rows.length > 0) {
    lines.push('');
  }
  if (message.withLegalLinks) {
    lines.push(
      'Pour en savoir plus :',
      `Conditions générales de vente : ${links.cgv}`,
      `Droit de rétractation (modalités et formulaire) : ${links.retractation}`,
      `Politique de confidentialité : ${links.confidentialite}`,
      '',
    );
  }
  lines.push('Merci de votre confiance,', "L'équipe Team Divergentes");

  return lines.join('\n');
}

/**
 * Version HTML. Tout ce qui vient du client (nom, adresse, flocage) ou d'une
 * saisie d'operateur (numero de suivi) passe par `escapeHtml` : ce sont des
 * donnees non fiables injectees dans du balisage.
 */
export function buildStatusChangeHtml(order: OrderWithItems, status: ClientNotifiedStatus): string {
  const message = buildStatusChangeMessage(order, status);
  const links = buildLegalLinks(getShopPublicOrigin());

  const paragraphs = message.paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const items =
    message.items.length > 0
      ? `<h3>Détail de votre commande</h3>
<ul>
${message.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')}
</ul>`
      : '';

  const rows =
    message.rows.length > 0
      ? `<table>
${message.rows
  .map(
    (row) =>
      `<tr><td style="padding:4px 12px 4px 0;"><strong>${escapeHtml(row.label)}</strong></td><td>${escapeHtml(row.value)}</td></tr>`,
  )
  .join('\n')}
</table>`
      : '';

  const legal = message.withLegalLinks
    ? `<h3>Pour en savoir plus</h3>
<ul>
<li><a href="${escapeHtml(links.cgv)}">Conditions générales de vente</a></li>
<li><a href="${escapeHtml(links.retractation)}">Droit de rétractation (modalités et formulaire)</a></li>
<li><a href="${escapeHtml(links.confidentialite)}">Politique de confidentialité</a></li>
</ul>`
    : '';

  return [
    `<h2>${escapeHtml(message.subject)}</h2>`,
    paragraphs,
    items,
    rows,
    legal,
    `<p>Merci de votre confiance,<br>L'équipe Team Divergentes</p>`,
  ]
    .filter(Boolean)
    .join('\n');
}

export interface DiscordEmbed {
  title: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
}

/**
 * L'embed Discord ne porte plus aucune donnee personnelle du client (nom,
 * e-mail, adresse) : ces informations partaient sans necessite vers un
 * sous-traitant americain (Discord Inc.), ce qui constituait un exces de
 * collecte au regard du RGPD. L'equipe consulte le back-office pour les
 * coordonnees ; le flocage reste, il est necessaire a la production.
 */
export function buildOrderDiscordEmbed(order: OrderWithItems): DiscordEmbed {
  return {
    title: `🛒 Nouvelle commande ${order.reference}`,
    color: 0x32d299,
    fields: [
      { name: 'Articles', value: order.items.map((item) => `• ${describeItem(item)}`).join('\n') },
      { name: 'Total', value: `${formatEuros(order.totalCents)} €`, inline: true },
      {
        name: 'Coordonnées client',
        value: 'Voir le back-office boutique pour le nom, l’e-mail et l’adresse de livraison.',
      },
    ],
  };
}

/**
 * Decrit une ligne en survente : ce que l'equipe doit recouper avec le
 * fournisseur pour savoir combien de pieces manquent reellement.
 */
function describeStockShortfall(line: StockShortfallLine): string {
  return `${line.productName} — taille ${line.size} : ${line.requested} demandé(s), ${line.available} disponible(s)`;
}

export function buildStockShortfallEmailText(
  order: OrderWithItems,
  shortfalls: StockShortfallLine[],
): string {
  return [
    `Survente détectée sur la commande ${order.reference}`,
    '',
    "La commande reste valide (le client a payé), mais le stock d'au moins une taille est tombé à zéro :",
    ...shortfalls.map((line) => `  - ${describeStockShortfall(line)}`),
  ].join('\n');
}

export function buildStockShortfallEmailHtml(
  order: OrderWithItems,
  shortfalls: StockShortfallLine[],
): string {
  const items = shortfalls
    .map((line) => `<li>${escapeHtml(describeStockShortfall(line))}</li>`)
    .join('\n');

  return `<h2>Survente détectée sur la commande ${escapeHtml(order.reference)}</h2>
<p>La commande reste valide (le client a payé), mais le stock d'au moins une taille est tombé à zéro :</p>
<ul>
${items}
</ul>`;
}

/**
 * Meme regle RGPD que `buildOrderDiscordEmbed` : aucune donnee personnelle du
 * client dans cet embed.
 */
export function buildStockShortfallDiscordEmbed(
  order: OrderWithItems,
  shortfalls: StockShortfallLine[],
): DiscordEmbed {
  return {
    title: `⚠️ Survente détectée — commande ${order.reference}`,
    color: 0xe74c3c,
    fields: [
      {
        name: 'Lignes en dépassement',
        value: shortfalls.map((line) => `• ${describeStockShortfall(line)}`).join('\n'),
      },
    ],
  };
}
