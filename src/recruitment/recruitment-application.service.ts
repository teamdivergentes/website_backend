import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ApplyRecruitmentDto } from './dto/apply-recruitment.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RecruitmentApplicationService {
  private readonly logger = new Logger(RecruitmentApplicationService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendApplication(
    dto: ApplyRecruitmentDto,
    cv?: Express.Multer.File,
    coverLetter?: Express.Multer.File,
  ): Promise<{ success: boolean; message: string }> {
    const results = {
      email: false,
      discord: false,
    };

    // Envoi email
    try {
      await this.sendEmail(dto, cv, coverLetter);
      results.email = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email sending failed: ${message}`);
    }

    // Envoi Discord webhook
    try {
      await this.sendDiscordWebhook(dto, cv, coverLetter);
      results.discord = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Discord webhook failed: ${message}`);
    }

    if (!results.email && !results.discord) {
      return {
        success: false,
        message: "Erreur lors de l'envoi de la candidature. Veuillez réessayer plus tard.",
      };
    }

    // Partial failure - at least one channel worked
    if (!results.email || !results.discord) {
      const failedChannel = !results.email ? 'email' : 'Discord';
      this.logger.warn(`Application sent but ${failedChannel} notification failed`);
    }

    return {
      success: true,
      message:
        'Votre candidature a bien été envoyée. Nous vous répondrons dans les plus brefs délais.',
    };
  }

  private async sendEmail(
    dto: ApplyRecruitmentDto,
    cv?: Express.Multer.File,
    coverLetter?: Express.Multer.File,
  ): Promise<void> {
    // Récupérer les configs SMTP depuis la base de données
    const [smtpHost, smtpPort, smtpUser, smtpPass, contactEmail] = await Promise.all([
      this.configService.getValue('contact_smtp_host'),
      this.configService.getValue('contact_smtp_port'),
      this.configService.getValue('contact_smtp_user'),
      this.configService.getValue('contact_smtp_pass'),
      this.configService.getValue('contact_email'),
    ]);

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP configuration missing in database');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587', 10),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const recipientEmail = contactEmail || smtpUser;

    const attachments = [];
    if (cv) {
      attachments.push({ filename: cv.originalname, content: cv.buffer });
    }
    if (coverLetter) {
      attachments.push({ filename: coverLetter.originalname, content: coverLetter.buffer });
    }

    const mailOptions = {
      from: `"DVG Recrutement" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: dto.email,
      subject: `[DVG Candidature] ${dto.postTitle} - ${dto.name}`,
      html: this.buildEmailHtml(dto, cv, coverLetter),
      text: this.buildEmailText(dto, cv, coverLetter),
      ...(attachments.length > 0 && { attachments }),
    };

    await transporter.sendMail(mailOptions);
    this.logger.log(`Application email sent successfully to ${recipientEmail}`);
  }

  private buildEmailHtml(
    dto: ApplyRecruitmentDto,
    cv?: Express.Multer.File,
    coverLetter?: Express.Multer.File,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #32D299, #28413B); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #28413B; }
          .value { margin-top: 5px; }
          .message { background: white; padding: 15px; border-left: 4px solid #32D299; margin-top: 10px; }
          .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
          .cv-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .cv-yes { background: #32D299; color: white; }
          .cv-no { background: #ddd; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Nouvelle candidature DVG</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Poste :</div>
              <div class="value">${dto.postTitle}</div>
            </div>
            <div class="field">
              <div class="label">Type de contrat :</div>
              <div class="value">${dto.postType}</div>
            </div>
            <div class="field">
              <div class="label">Nom :</div>
              <div class="value">${dto.name}</div>
            </div>
            <div class="field">
              <div class="label">Email :</div>
              <div class="value"><a href="mailto:${dto.email}">${dto.email}</a></div>
            </div>
            <div class="field">
              <div class="label">CV :</div>
              <div class="value">
                <span class="${cv ? 'cv-badge cv-yes' : 'cv-badge cv-no'}">
                  ${cv ? `Fichier joint : ${cv.originalname}` : 'Non fourni'}
                </span>
              </div>
            </div>
            <div class="field">
              <div class="label">Lettre de motivation :</div>
              <div class="value">
                <span class="${coverLetter ? 'cv-badge cv-yes' : 'cv-badge cv-no'}">
                  ${coverLetter ? `Fichier joint : ${coverLetter.originalname}` : 'Non fournie'}
                </span>
              </div>
            </div>
            ${
              dto.message
                ? `<div class="field">
              <div class="label">Message :</div>
              <div class="message">${dto.message.replace(/\n/g, '<br>')}</div>
            </div>`
                : ''
            }
          </div>
          <div class="footer">
            Ce message a été envoyé via le formulaire de candidature DVG
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildEmailText(
    dto: ApplyRecruitmentDto,
    cv?: Express.Multer.File,
    coverLetter?: Express.Multer.File,
  ): string {
    return `
Nouvelle candidature DVG
========================

Poste: ${dto.postTitle}
Type de contrat: ${dto.postType}
Nom: ${dto.name}
Email: ${dto.email}
CV: ${cv ? `Fichier joint : ${cv.originalname}` : 'Non fourni'}
Lettre de motivation: ${coverLetter ? `Fichier joint : ${coverLetter.originalname}` : 'Non fournie'}
${dto.message ? `\nMessage:\n${dto.message}` : ''}

---
Ce message a été envoyé via le formulaire de candidature DVG
    `.trim();
  }

  private async sendDiscordWebhook(
    dto: ApplyRecruitmentDto,
    cv?: Express.Multer.File,
    coverLetter?: Express.Multer.File,
  ): Promise<void> {
    const webhookUrl =
      (await this.configService.getValue('recruitment_discord_webhook')) ||
      (await this.configService.getValue('contact_discord_webhook'));

    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured in database');
    }

    // Construire la section documents
    const docs: string[] = [];
    if (cv) docs.push(`📄 **CV** — \`${cv.originalname}\``);
    else docs.push('📄 **CV** — *Non fourni*');
    if (coverLetter) docs.push(`📝 **Lettre de motivation** — \`${coverLetter.originalname}\``);
    else docs.push('📝 **Lettre de motivation** — *Non fournie*');

    const embed = {
      author: {
        name: 'NOUVELLE CANDIDATURE',
      },
      title: dto.postTitle,
      description: `> **${dto.postType}**\n\n`,
      color: 0x32d299,
      fields: [
        {
          name: '👤 Candidat',
          value: `**${dto.name}**`,
          inline: true,
        },
        {
          name: '📧 Contact',
          value: dto.email,
          inline: true,
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: false,
        },
        {
          name: '📎 Documents joints',
          value: docs.join('\n'),
          inline: false,
        },
        ...(dto.message
          ? [
              {
                name: '💬 Pourquoi moi ?',
                value:
                  dto.message.length > 1000
                    ? `>>> ${dto.message.substring(0, 997)}...`
                    : `>>> ${dto.message}`,
                inline: false,
              },
            ]
          : []),
      ],
      footer: {
        text: 'DVG Recrutement • teamdivergentes.fr',
      },
      timestamp: new Date().toISOString(),
    };

    // Construire les descriptions d'attachments pour Discord
    const attachments = [];
    const filesToUpload = [];
    let fileIndex = 0;
    if (cv) {
      filesToUpload.push(cv);
      attachments.push({
        id: fileIndex,
        filename: cv.originalname,
        description: `CV de ${dto.name} — ${dto.postTitle}`,
      });
      fileIndex++;
    }
    if (coverLetter) {
      filesToUpload.push(coverLetter);
      attachments.push({
        id: fileIndex,
        filename: coverLetter.originalname,
        description: `Lettre de motivation de ${dto.name} — ${dto.postTitle}`,
      });
      fileIndex++;
    }

    const payload = {
      username: 'DVG Recrutement',
      avatar_url: 'https://teamdivergentes.fr/assets/images/dvg_logo.webp',
      embeds: [embed],
      ...(attachments.length > 0 && { attachments }),
    };

    let response: Response;

    if (filesToUpload.length > 0) {
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(payload));
      filesToUpload.forEach((f, i) => {
        formData.append(`files[${i}]`, new Blob([new Uint8Array(f.buffer)]), f.originalname);
      });
      response = await fetch(webhookUrl, { method: 'POST', body: formData });
    } else {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      throw new Error(`Discord webhook returned ${response.status}`);
    }

    this.logger.log('Discord webhook sent successfully');
  }
}
