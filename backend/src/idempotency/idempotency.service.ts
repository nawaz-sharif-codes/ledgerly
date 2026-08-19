import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import stringify from 'json-stable-stringify';
import { DataSource, type EntityManager } from 'typeorm';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';

export interface IdempotentResult<T> {
  value: T;
  replayed: boolean;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly dataSource: DataSource) {}

  async execute<T extends Record<string, unknown>>(
    key: string | undefined,
    request: Record<string, unknown>,
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<IdempotentResult<T>> {
    const validKey = this.validateKey(key);
    const requestHash = this.hash(request);

    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const insertResult: unknown = await manager.query(
        `
          INSERT INTO "idempotency_keys" ("key", "request_hash", "status")
          VALUES ($1, $2, 'in_progress')
          ON CONFLICT ("key") DO NOTHING
          RETURNING "key"
        `,
        [validKey, requestHash],
      );

      if (!Array.isArray(insertResult)) {
        throw new Error('Unexpected idempotency insert result.');
      }

      if (insertResult.length === 0) {
        const existing = await manager
          .getRepository(IdempotencyKeyEntity)
          .findOneByOrFail({ key: validKey });

        if (existing.requestHash !== requestHash) {
          throw new UnprocessableEntityException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message:
              'The idempotency key was already used for another request.',
          });
        }

        if (existing.status === 'in_progress') {
          throw new ConflictException({
            code: 'REQUEST_IN_PROGRESS',
            message:
              'A request with this idempotency key is still in progress.',
          });
        }

        return {
          value: existing.responseBody as T,
          replayed: true,
        };
      }

      const value = await operation(manager);

      const repository = manager.getRepository(IdempotencyKeyEntity);
      const idempotencyRecord = await repository.findOneByOrFail({
        key: validKey,
      });
      idempotencyRecord.status = 'completed';
      idempotencyRecord.responseBody = value;
      await repository.save(idempotencyRecord);

      return { value, replayed: false };
    });
  }

  hash(request: Record<string, unknown>): string {
    const canonicalRequest = stringify(request);

    if (canonicalRequest === undefined) {
      throw new Error('Unable to serialize idempotency request.');
    }

    return createHash('sha256').update(canonicalRequest).digest('hex');
  }

  private validateKey(key: string | undefined): string {
    if (!key) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required.',
      });
    }

    if (!isUUID(key, '4')) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be a UUID v4.',
      });
    }

    return key;
  }
}
