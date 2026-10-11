/**
 * Point d'entrée de l'application NestJS — Backend IUA (enseignant / étudiant /
 * chef de classe / administrateur)
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { corsOriginCallback } from './common/config/cors';

/**
 * En production, on refuse de démarrer sans les secrets JWT : le code contient
 * des valeurs par défaut "_dev" qui permettraient à n'importe qui de forger
 * des jetons si la variable était oubliée sur l'hébergeur.
 */
function assertProductionConfig(logger: Logger): void {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
  if (!isProd) return;

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_SECRET_ETUDIANT',
    'JWT_ADMIN_SECRET',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes en production : ${missing.join(', ')}`,
    );
  }
  if (!process.env.CORS_ORIGINS) {
    logger.warn(
      'CORS_ORIGINS non défini : toutes les origines sont acceptées. ' +
        'Renseignez les URLs de vos frontends Vercel.',
    );
  }
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  assertProductionConfig(logger);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render (comme Vercel) place l'application derrière un proxy : sans cela,
  // l'adresse IP et le protocole vus par l'API seraient ceux du proxy.
  app.set('trust proxy', 1);

  // Préfixe global pour toutes les routes
  app.setGlobalPrefix('api');

  // Route de santé pour Render (Health Check Path = /api/health)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get(
    '/api/health',
    (_req: unknown, res: { json: (body: unknown) => void }) => {
      res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
    },
  );

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS : liste blanche pilotée par la variable CORS_ORIGINS (voir cors.ts)
  app.enableCors({
    origin: corsOriginCallback,
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application démarrée sur le port ${port}`);
}

bootstrap();
