import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { DEMO_PERSONAS } from '../src/common/demo-personas';

interface WalletResponse {
  id: string;
  userId: string;
  currency: 'INR' | 'USD';
  balance: string;
}

interface MovementResponse {
  transaction: { id: string; amount: string };
  wallet?: WalletResponse;
}

interface HistoryResponse {
  items: Array<{ transactionId: string; amount: string }>;
  nextCursor: string | null;
}

interface ErrorResponse {
  code: string;
}

describe('Ledgerly API (e2e)', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
    await fastify.ready();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports health with a request ID', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body).toEqual(
      expect.objectContaining({ status: 'ok', service: 'ledgerly-api' }),
    );
  });

  it('creates and lists a customer wallet', async () => {
    const userId = randomUUID();
    const wallet = await createWallet(userId, 'INR');
    const response = await request(app.getHttpServer())
      .get('/wallets')
      .query({ userId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [wallet] });
  });

  it('rejects duplicate user and currency wallets', async () => {
    const userId = randomUUID();
    await createWallet(userId, 'USD');
    const response = await request(app.getHttpServer())
      .post('/wallets')
      .send({ userId, currency: 'USD' });

    expect(response.status).toBe(409);
    expect(bodyAs<ErrorResponse>(response).code).toBe('WALLET_ALREADY_EXISTS');
  });

  it('deposits balanced entries and replays the stored response', async () => {
    const wallet = await createWallet(DEMO_PERSONAS.alice.id, 'INR');
    const key = randomUUID();
    const first = await request(app.getHttpServer())
      .post(`/wallets/${wallet.id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: '1000.25' });
    const replay = await request(app.getHttpServer())
      .post(`/wallets/${wallet.id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: '1000.2500' });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(first.headers['idempotency-replayed']).toBe('false');
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body);

    const movement = bodyAs<MovementResponse>(first);
    const balanceResult: unknown = await dataSource.query(
      `SELECT SUM("amount") AS "total", COUNT(*) AS "count" FROM "ledger_entries" WHERE "transaction_id" = $1`,
      [movement.transaction.id],
    );
    const balanceRows = balanceResult as Array<{
      total: string;
      count: string;
    }>;
    expect(balanceRows[0]).toEqual({ total: '0.0000', count: '2' });
  });

  it('rejects missing keys and key reuse with different input', async () => {
    const wallet = await createWallet(randomUUID(), 'INR');
    const missing = await request(app.getHttpServer())
      .post(`/wallets/${wallet.id}/deposit`)
      .send({ amount: '10.00' });
    const key = randomUUID();
    await deposit(wallet.id, '10.00', key);
    const reused = await request(app.getHttpServer())
      .post(`/wallets/${wallet.id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: '11.00' });

    expect(missing.status).toBe(400);
    expect(bodyAs<ErrorResponse>(missing).code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );
    expect(reused.status).toBe(422);
    expect(bodyAs<ErrorResponse>(reused).code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('coalesces concurrent retries into one deposit', async () => {
    const wallet = await createWallet(randomUUID(), 'USD');
    const key = randomUUID();
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/wallets/${wallet.id}/deposit`)
        .set('Idempotency-Key', key)
        .send({ amount: '5.00' }),
      request(app.getHttpServer())
        .post(`/wallets/${wallet.id}/deposit`)
        .set('Idempotency-Key', key)
        .send({ amount: '5.0000' }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(
      responses
        .map((response) => response.headers['idempotency-replayed'])
        .sort(),
    ).toEqual(['false', 'true']);
    const walletResponse = await request(app.getHttpServer()).get(
      `/wallets/${wallet.id}`,
    );
    expect(bodyAs<WalletResponse>(walletResponse).balance).toBe('5.0000');
  });

  it('transfers funds and rejects invalid wallet combinations', async () => {
    const source = await createWallet(randomUUID(), 'USD');
    const destination = await createWallet(randomUUID(), 'USD');
    const inrWallet = await createWallet(randomUUID(), 'INR');
    await deposit(source.id, '200.00');

    const transfer = await request(app.getHttpServer())
      .post('/transfers')
      .set('Idempotency-Key', randomUUID())
      .send({
        fromWalletId: source.id,
        toWalletId: destination.id,
        amount: '75.50',
      });
    const mismatch = await request(app.getHttpServer())
      .post('/transfers')
      .set('Idempotency-Key', randomUUID())
      .send({
        fromWalletId: source.id,
        toWalletId: inrWallet.id,
        amount: '1.00',
      });
    const self = await request(app.getHttpServer())
      .post('/transfers')
      .set('Idempotency-Key', randomUUID())
      .send({
        fromWalletId: source.id,
        toWalletId: source.id,
        amount: '1.00',
      });

    expect(transfer.status).toBe(201);
    expect(mismatch.status).toBe(422);
    expect(bodyAs<ErrorResponse>(mismatch).code).toBe('CURRENCY_MISMATCH');
    expect(self.status).toBe(422);
    expect(bodyAs<ErrorResponse>(self).code).toBe('SELF_TRANSFER_NOT_ALLOWED');
  });

  it('serializes concurrent transfers so a wallet cannot overdraw', async () => {
    const source = await createWallet(randomUUID(), 'INR');
    const firstDestination = await createWallet(randomUUID(), 'INR');
    const secondDestination = await createWallet(randomUUID(), 'INR');
    await deposit(source.id, '100.00');

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/transfers')
        .set('Idempotency-Key', randomUUID())
        .send({
          fromWalletId: source.id,
          toWalletId: firstDestination.id,
          amount: '80.00',
        }),
      request(app.getHttpServer())
        .post('/transfers')
        .set('Idempotency-Key', randomUUID())
        .send({
          fromWalletId: source.id,
          toWalletId: secondDestination.id,
          amount: '80.00',
        }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 422,
    ]);
    const sourceResponse = await request(app.getHttpServer()).get(
      `/wallets/${source.id}`,
    );
    expect(bodyAs<WalletResponse>(sourceResponse).balance).toBe('20.0000');
  });

  it('rolls back a failed transfer and permits a safe retry', async () => {
    const source = await createWallet(randomUUID(), 'USD');
    const destination = await createWallet(randomUUID(), 'USD');
    const key = randomUUID();
    const payload = {
      fromWalletId: source.id,
      toWalletId: destination.id,
      amount: '25.00',
    };
    const failed = await request(app.getHttpServer())
      .post('/transfers')
      .set('Idempotency-Key', key)
      .send(payload);

    expect(failed.status).toBe(422);
    expect(bodyAs<ErrorResponse>(failed).code).toBe('INSUFFICIENT_FUNDS');

    await deposit(source.id, '25.00');
    const retried = await request(app.getHttpServer())
      .post('/transfers')
      .set('Idempotency-Key', key)
      .send(payload);

    expect(retried.status).toBe(201);
  });

  it('returns stable cursor-paginated transaction history', async () => {
    const wallet = await createWallet(randomUUID(), 'USD');
    await deposit(wallet.id, '1.00');
    await deposit(wallet.id, '2.00');
    await deposit(wallet.id, '3.00');

    const firstPage = await request(app.getHttpServer())
      .get(`/wallets/${wallet.id}/transactions`)
      .query({ limit: 2 });
    const firstBody = bodyAs<HistoryResponse>(firstPage);
    const secondPage = await request(app.getHttpServer())
      .get(`/wallets/${wallet.id}/transactions`)
      .query({ limit: 2, cursor: firstBody.nextCursor });
    const secondBody = bodyAs<HistoryResponse>(secondPage);

    expect(firstPage.status).toBe(200);
    expect(firstBody.items).toHaveLength(2);
    expect(firstBody.nextCursor).toEqual(expect.any(String));
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.nextCursor).toBeNull();
    expect(
      new Set(
        [...firstBody.items, ...secondBody.items].map(
          (entry) => entry.transactionId,
        ),
      ).size,
    ).toBe(3);
  });

  it('installs enabled database triggers for immutability and balancing', async () => {
    const triggerResult: unknown = await dataSource.query(`
      SELECT "tgname" FROM "pg_trigger"
      WHERE "tgrelid" = 'ledger_entries'::regclass AND NOT "tgisinternal"
      ORDER BY "tgname"
    `);
    const triggers = triggerResult as Array<{ tgname: string }>;

    expect(triggers).toEqual([
      { tgname: 'trg_ledger_entries_balanced' },
      { tgname: 'trg_ledger_entries_immutable' },
    ]);
  });

  async function createWallet(
    userId: string,
    currency: 'INR' | 'USD',
  ): Promise<WalletResponse> {
    const response = await request(app.getHttpServer())
      .post('/wallets')
      .send({ userId, currency });

    if (response.status === 409) {
      const listResponse = await request(app.getHttpServer())
        .get('/wallets')
        .query({ userId });
      const wallets = bodyAs<{ items: WalletResponse[] }>(listResponse).items;
      const existing = wallets.find((wallet) => wallet.currency === currency);

      if (existing) {
        return existing;
      }
    }

    expect(response.status).toBe(201);
    return bodyAs<WalletResponse>(response);
  }

  async function deposit(
    walletId: string,
    amount: string,
    key = randomUUID(),
  ): Promise<MovementResponse> {
    const response = await request(app.getHttpServer())
      .post(`/wallets/${walletId}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount });

    expect(response.status).toBe(201);
    return bodyAs<MovementResponse>(response);
  }

  function bodyAs<T>(response: request.Response): T {
    const body: unknown = response.body;
    return body as T;
  }
});
