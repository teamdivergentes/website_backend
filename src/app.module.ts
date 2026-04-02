import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { UploadModule } from './upload/upload.module';
import { ConfigModule } from './config/config.module';
import { StaffModule } from './staff/staff.module';
import { TeamsModule } from './teams/teams.module';
import { GamesModule } from './games/games.module';
import { ProfileModule } from './profile/profile.module';
import { SponsorsModule } from './sponsors/sponsors.module';
import { ContactModule } from './contact/contact.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { ArticleTypesModule } from './article-types/article-types.module';
import { ArticlesModule } from './articles/articles.module';
import { MetricsModule } from './metrics/metrics.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Rate limiting: 60 requests per 60 seconds by default
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 60, // 60 requests
      },
    ]),
    AuthModule,
    UsersModule,
    RolesModule,
    UploadModule,
    ConfigModule,
    StaffModule,
    TeamsModule,
    GamesModule,
    ProfileModule,
    SponsorsModule,
    ContactModule,
    RecruitmentModule,
    AnalyticsModule,
    SitemapModule,
    ArticleTypesModule,
    ArticlesModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
