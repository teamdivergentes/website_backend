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
    file?: Express.Multer.File,
  ): Promise<{ success: boolean; message: string }> {
    const results = {
      email: false,
      discord: false,
    };

    // Envoi email
    try {
      await this.sendEmail(dto, file);
      results.email = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email sending failed: ${message}`);
    }

    // Envoi Discord webhook
    try {
      await this.sendDiscordWebhook(dto, file);
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

    return {
      success: true,
      message:
        'Votre candidature a bien été envoyée. Nous vous répondrons dans les plus brefs délais.',
    };
  }

  private async sendEmail(dto: ApplyRecruitmentDto, file?: Express.Multer.File): Promise<void> {
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
      from: `"DVG Recrutement" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: dto.email,
      subject: `[DVG Candidature] ${dto.postTitle} - ${dto.name}`,
      html: this.buildEmailHtml(dto, file),
      text: this.buildEmailText(dto, file),
      ...(file && {
        attachments: [
          {
            filename: file.originalname,
            content: file.buffer,
          },
        ],
      }),
    };

    await transporter.sendMail(mailOptions);
    this.logger.log(`Application email sent successfully to ${recipientEmail}`);
  }

  private buildEmailHtml(dto: ApplyRecruitmentDto, file?: Express.Multer.File): string {
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
                <span class="${file ? 'cv-badge cv-yes' : 'cv-badge cv-no'}">
                  ${file ? `Fichier joint : ${file.originalname}` : 'Non fourni'}
                </span>
              </div>
            </div>
            ${dto.message ? `<div class="field">
              <div class="label">Message :</div>
              <div class="message">${dto.message.replace(/\n/g, '<br>')}</div>
            </div>` : ''}
          </div>
          <div class="footer">
            Ce message a été envoyé via le formulaire de candidature DVG
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildEmailText(dto: ApplyRecruitmentDto, file?: Express.Multer.File): string {
    return `
Nouvelle candidature DVG
========================

Poste: ${dto.postTitle}
Type de contrat: ${dto.postType}
Nom: ${dto.name}
Email: ${dto.email}
CV: ${file ? `Fichier joint : ${file.originalname}` : 'Non fourni'}
${dto.message ? `\nMessage:\n${dto.message}` : ''}

---
Ce message a été envoyé via le formulaire de candidature DVG
    `.trim();
  }

  private async sendDiscordWebhook(
    dto: ApplyRecruitmentDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    const webhookUrl =
      (await this.configService.getValue('recruitment_discord_webhook')) ||
      (await this.configService.getValue('contact_discord_webhook'));

    if (!webhookUrl) {
      this.logger.warn(
        'Discord webhook URL not configured in database - skipping Discord notification',
      );
      return;
    }

    const embed = {
      title: 'Nouvelle candidature',
      color: 0x32d299, // Vert DVG
      fields: [
        {
          name: 'Poste',
          value: dto.postTitle,
          inline: true,
        },
        {
          name: 'Type',
          value: dto.postType,
          inline: true,
        },
        {
          name: 'Nom',
          value: dto.name,
          inline: true,
        },
        {
          name: 'Email',
          value: dto.email,
          inline: true,
        },
        {
          name: 'CV',
          value: file ? `✅ ${file.originalname}` : '❌ Non fourni',
          inline: true,
        },
        ...(dto.message ? [{
          name: 'Message',
          value: dto.message.length > 1024 ? dto.message.substring(0, 1021) + '...' : dto.message,
          inline: false,
        }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'DVG Recrutement',
      },
    };

    const payload = {
      username: 'DVG Recrutement',
      embeds: [embed],
    };

    let response: Response;

    if (file) {
      // Multipart/form-data pour envoyer le fichier CV sur Discord
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(payload));
      formData.append(
        'files[0]',
        new Blob([new Uint8Array(file.buffer)]),
        file.originalname,
      );
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
