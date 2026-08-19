import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';

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
    HealthModule,
  ],
})
export class AppModule {}
