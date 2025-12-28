// Set config directory path before loading config
// This ensures config files are found when running from dist/
import * as path from 'path';
if (!process.env.NODE_CONFIG_DIR) {
  // In production (dist/), config is at dist/config
  // In development, config is at project root
  const configDir = __dirname.includes('dist')
    ? path.join(__dirname, '..', 'config')
    : path.join(__dirname, '..', '..', '..', 'config');
  process.env.NODE_CONFIG_DIR = configDir;
}

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './modules/core/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.getAppConfiguration();
  const { port, prefix, url } = appConfig;

  app.enableCors({
    origin: '*',
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

  const config = new DocumentBuilder()
    .setTitle('Quiz Game API')
    .setDescription('Quiz Game Backend API Documentation')
    .setVersion('1.0')
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
