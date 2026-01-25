import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ContactDto } from './dto/contact.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendContact(contactDto: ContactDto): Promise<{ success: boolean; message: string }> {
    const results = {
      email: false,
      discord: false,
    };

    // Envoi email
    try {
      await this.sendEmail(contactDto);
      results.email = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email sending failed: ${message}`);
    }

    // Envoi Discord webhook
    try {
      await this.sendDiscordWebhook(contactDto);
      results.discord = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Discord webhook failed: ${message}`);
    }

    if (!results.email && !results.discord) {
      return {
        success: false,
        message: "Erreur lors de l'envoi du message. Veuillez réessayer plus tard.",
      };
    }

    return {
      success: true,
      message: 'Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.',
    };
  }

  private async sendEmail(contactDto: ContactDto): Promise<void> {
    // Récupérer les configs SMTP depuis la base de données
    const [smtpHost, smtpPort, smtpUser, smtpPass, contactEmail] = await Promise.all([
      this.configService.getValue('contact_smtp_host'),
      this.configService.getValue('contact_smtp_port'),
      this.configService.getValue('contact_smtp_user'),
      this.configService.getValue('contact_smtp_pass'),
      this.configService.getValue('contact_email'),
    ]);

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP configuration missing in database - skipping email');
      return;
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

    const mailOptions = {
      from: `"DVG Contact" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: contactDto.email,
      subject: `[DVG Contact] ${contactDto.subject} - ${contactDto.name}`,
      html: this.buildEmailHtml(contactDto),
      text: this.buildEmailText(contactDto),
    };

    await transporter.sendMail(mailOptions);
    this.logger.log(`Email sent successfully to ${recipientEmail}`);
  }

  private buildEmailHtml(contactDto: ContactDto): string {
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Nouveau message de contact DVG</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Sujet :</div>
              <div class="value">${contactDto.subject}</div>
            </div>
            <div class="field">
              <div class="label">Nom :</div>
              <div class="value">${contactDto.name}</div>
            </div>
            <div class="field">
              <div class="label">Email :</div>
              <div class="value"><a href="mailto:${contactDto.email}">${contactDto.email}</a></div>
            </div>
            <div class="field">
              <div class="label">Message :</div>
              <div class="message">${contactDto.message.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
          <div class="footer">
            Ce message a été envoyé via le formulaire de contact DVG
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildEmailText(contactDto: ContactDto): string {
    return `
Nouveau message de contact DVG
==============================

Sujet: ${contactDto.subject}
Nom: ${contactDto.name}
Email: ${contactDto.email}

Message:
${contactDto.message}

---
Ce message a été envoyé via le formulaire de contact DVG
    `.trim();
  }

  private async sendDiscordWebhook(contactDto: ContactDto): Promise<void> {
    const webhookUrl = await this.configService.getValue('contact_discord_webhook');

    if (!webhookUrl) {
      this.logger.warn(
        'Discord webhook URL not configured in database - skipping Discord notification',
      );
      return;
    }

    const embed = {
      title: `Nouveau message de contact`,
      color: 0x32d299, // Vert DVG
      fields: [
        {
          name: 'Sujet',
          value: contactDto.subject,
          inline: true,
        },
        {
          name: 'Nom',
          value: contactDto.name,
          inline: true,
        },
        {
          name: 'Email',
          value: contactDto.email,
          inline: true,
        },
        {
          name: 'Message',
          value:
            contactDto.message.length > 1024
              ? contactDto.message.substring(0, 1021) + '...'
              : contactDto.message,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'DVG Contact Form',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'DVG Contact',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook returned ${response.status}`);
    }

    this.logger.log('Discord webhook sent successfully');
  }
}
