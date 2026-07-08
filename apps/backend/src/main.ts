import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  // CORS configurable via env var
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin:
      corsOrigin === '*' || !corsOrigin
        ? true // Autorise toutes les origines
        : corsOrigin.split(',').map((o) => o.trim()),
    methods: 'GET',
    credentials: false,
  });

  const port = parseInt(process.env.PORT || '3000', 10);

  if (isProduction) {
    // En production (Docker) : écouter sur 0.0.0.0, port fixe
    await app.listen(port, '0.0.0.0');
    logger.log(`Backend démarré sur http://0.0.0.0:${port} (production)`);
    logger.log(`Health check: http://localhost:${port}/api/health`);
    logger.log(`Events API: http://localhost:${port}/api/events`);
  } else {
    // En dev : tenter plusieurs ports si le premier est occupé
    for (let p = port; p < port + 10; p++) {
      try {
        await app.listen(p);
        logger.log(`Backend démarré sur http://localhost:${p} (développement)`);
        logger.log(`Health check: http://localhost:${p}/api/health`);
        logger.log(`Events API: http://localhost:${p}/api/events`);
        return;
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Port ${p} déjà utilisé, tentative sur ${p + 1}...`);
          continue;
        }
        throw err;
      }
    }
    logger.error(
      `Impossible de trouver un port disponible (${port}-${port + 9})`,
    );
    process.exit(1);
  }
}
bootstrap();
