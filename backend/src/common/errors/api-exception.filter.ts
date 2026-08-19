import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorPayload {
  code?: string;
  message?: string | string[];
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const response = context.getResponse<FastifyReply>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload: ErrorPayload =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : {};
    const message =
      payload.message ??
      (typeof exceptionResponse === 'string'
        ? exceptionResponse
        : !(exception instanceof HttpException)
          ? 'An unexpected error occurred.'
          : 'The request could not be completed.');

    void response.status(statusCode).send({
      statusCode,
      code: payload.code ?? `HTTP_${statusCode}`,
      message: Array.isArray(message) ? 'Request validation failed.' : message,
      requestId: request.id,
      ...(Array.isArray(message) ? { details: message } : {}),
      ...(payload.details !== undefined ? { details: payload.details } : {}),
    });
  }
}
