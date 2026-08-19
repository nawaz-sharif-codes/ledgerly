import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { createTypeOrmOptions } from './database/typeorm.options';
import type { Environment } from './config/environment';
import { ConfigService } from '@nestjs/config';
import { WalletsModule } from './wallets/wallets.module';
import { TransfersModule } from './transfers/transfers.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestIdInterceptor } from './common/logging/request-id.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId(request, response) {
          const incomingRequestId = request.headers['x-request-id'];
          const requestId =
            typeof incomingRequestId === 'string'
              ? incomingRequestId
              : randomUUID();

          response.setHeader('x-request-id', requestId);
          return requestId;
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        createTypeOrmOptions({
          DATABASE_URL: config.getOrThrow('DATABASE_URL'),
          DATABASE_SSL: config.getOrThrow('DATABASE_SSL'),
        }),
    }),
    HealthModule,
    WalletsModule,
    TransfersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
  ],
})
export class AppModule {}
