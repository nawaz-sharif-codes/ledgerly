import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Environment } from './config/environment';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  const config = app.get(ConfigService<Environment, true>);

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    credentials: false,
    origin: config.getOrThrow<string[]>('CORS_ORIGINS'),
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ledgerly API')
    .setDescription('API for the Ledgerly payment and wallet platform.')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.getOrThrow<number>('PORT'), '0.0.0.0');
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        level: 'fatal',
        message: 'Ledgerly API failed to start',
        error: error instanceof Error ? error.message : 'Unknown startup error',
      }),
    );
    process.exitCode = 1;
  });
}
