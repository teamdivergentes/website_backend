import { Injectable, Logger } from '@nestjs/common';
import { ApplyRecruitmentDto } from './dto/apply-recruitment.dto';
import { ApplicationNotifierService } from './services/application-notifier.service';

@Injectable()
export class RecruitmentApplicationService {
  private readonly logger = new Logger(RecruitmentApplicationService.name);

  constructor(private readonly notifier: ApplicationNotifierService) {}

  async sendApplication(
    dto: ApplyRecruitmentDto,
    cv?: Express.Multer.File,
    coverLetter?: Express.Multer.File,
  ): Promise<{ success: boolean; message: string }> {
    const results = { email: false, discord: false };

    try {
      await this.notifier.sendEmail(dto, cv, coverLetter);
      results.email = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email sending failed: ${message}`);
    }

    try {
      await this.notifier.sendDiscordWebhook(dto, cv, coverLetter);
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
}
