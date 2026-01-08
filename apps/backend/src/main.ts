import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './modules/core/config.service';
import { execSync } from 'child_process';
import './shares/helpers/utils'; // Ensure .env and config are loaded early

// Get git commit hash
function getGitHash(): string {
  // First, try to get from environment variable (set during build in CI/CD)
  if (process.env.GIT_COMMIT_HASH) {
    return process.env.GIT_COMMIT_HASH;
  }

  // Fall back to git command (for local development)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

// Get git branch
function getGitBranch(): string {
  // First, try to get from environment variable (set during build in CI/CD)
  if (process.env.GIT_BRANCH) {
    return process.env.GIT_BRANCH;
  }

  // Fall back to git command (for local development)
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

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

  const gitHash = getGitHash();
  const gitBranch = getGitBranch();
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
