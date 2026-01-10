import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './modules/core/config.service';
import './shares/helpers/utils'; // Ensure .env and config are loaded early

// Import version info generated during build
import * as versionInfo from './version.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.getAppConfiguration();
  const { port, prefix, url } = appConfig;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins for development, but handle credentials correctly
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix(prefix);

  const gitHash = versionInfo.commitHash || 'unknown';
  const gitBranch = versionInfo.branch || 'unknown';
  const version = `1.0.0 (${gitBranch}@${gitHash})`;

  const config = new DocumentBuilder()
    .setTitle('Quiz Game API')
    .setDescription(
      `Quiz Game Backend API Documentation\n\n**Version:** ${version}\n**Commit:** ${gitHash}\n**Branch:** ${gitBranch}`,
    )
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, async () => {
    console.log(`Application is running on: ${url}/${prefix}`);
    console.log(`Swagger documentation available on: ${url}/docs`);
  });
}
bootstrap();
