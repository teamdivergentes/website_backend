import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // rawBody: necessaire a la verification de signature des webhooks Stripe,
  // qui calcule un HMAC sur les octets exacts du corps de la requete.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Security: Helmet middleware for HTTP headers
  app.use(helmet());

  // Parsing des cookies (nécessaire pour lire dvg_auth_token)
  app.use(cookieParser());

  // Serve static files from uploads directory
  // Using process.cwd() because multer saves to ./uploads (relative to cwd)
  // while __dirname points to dist/src after compilation
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Configuration CORS pour permettre les requêtes du frontend
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:4200', // Angular dev server
        'http://localhost:8080', // Frontend Docker
        'http://127.0.0.1:4200',
        'http://127.0.0.1:8080',
      ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Configuration Swagger (désactivé en production)
  if (process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Team Divergentes API')
      .setDescription('API documentation for Team Divergentes backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
