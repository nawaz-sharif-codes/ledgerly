# Ledgerly

Ledgerly is a production-minded wallet and payment platform built around an immutable, double-entry ledger. Phase 1 is a modular monolith: the accounting and concurrency invariants are proven before distributed infrastructure is introduced.

> Ledgerly is a portfolio demonstration. It has no authentication and must not be used for real money or personal data.

## Phase 1 capabilities

- Create one INR and one USD customer wallet per demo persona.
- Deposit funds against a platform clearing wallet in the same currency.
- Transfer funds atomically between matching-currency wallets.
- Record every movement as balanced, signed `NUMERIC(19,4)` ledger entries.
- Replay completed mutations safely with UUID v4 idempotency keys.
- Prevent overdrafts with deterministic PostgreSQL row locks.
- Browse stable cursor-paginated transaction history.
- Switch between the stable Alice and Bob demo personas.
- Explain Render free-tier cold starts in the product interface.

The product dashboard is available at `/`; the approved component baseline remains at `/style-guide`.

## Architecture

```text
Next.js client
     │
     ▼
NestJS + Fastify API
     │
     ├── WalletsService ──┐
     ├── TransfersService ├── one database transaction
     ├── Idempotency      │
     └── LedgerService ───┘
                 │
                 ▼
             PostgreSQL
```

`LedgerService` is the only ledger writer. Deposits and transfers commit the transaction record, two balanced ledger entries, cached wallet balances, and idempotency response together or roll everything back.

### Accounting invariants

- API amounts are decimal strings; application arithmetic uses `decimal.js`.
- PostgreSQL stores money as `NUMERIC(19,4)`; JavaScript floating-point arithmetic is never used for money.
- Debits are negative and credits are positive. Every transaction sums to exactly zero.
- Customer balances cannot become negative.
- `ledger_entries` is append-only. PostgreSQL triggers reject every update or delete.
- A deferred constraint trigger validates ledger balance before commit.
- INR and USD are isolated. Currency conversion is intentionally unsupported.

## Technology

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | NestJS 11, Fastify, TypeORM, `decimal.js` |
| Database | PostgreSQL 17 locally and in CI; Neon for the free deployment |
| Tooling | pnpm 10, Turborepo orchestration, Docker Compose |
| CI/CD | GitHub Actions with a PostgreSQL service container |
| Hosting | Vercel frontend, Render free web service, Neon PostgreSQL |

Turborepo only orchestrates root `dev`, `build`, `lint`, `typecheck`, and `test` commands across `frontend` and `backend`; it does not drive application structure.

## Governing documents

- [AGENTS.md](./AGENTS.md) defines non-negotiable accounting and workflow rules.
- [DESIGN.md](./DESIGN.md) defines the visual tokens and component rules.
- [payment-ledger-platform-architecture.md](./payment-ledger-platform-architecture.md) defines Phase 1 boundaries, schema, and API contracts.

Read all three before contributing.

## Local development

### Prerequisites

- Node.js 24 (`.nvmrc` pins the version)
- pnpm 10.28.2 through Corepack
- Docker Desktop, or an existing PostgreSQL 17 instance

### Start the database and applications

```bash
corepack enable
pnpm install --frozen-lockfile
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up -d postgres
pnpm --filter @ledgerly/backend migration:run
pnpm dev
```

| Service | Local URL |
| --- | --- |
| Product | `http://localhost:3000` |
| Style guide | `http://localhost:3000/style-guide` |
| API health | `http://localhost:3001/health` |
| Swagger | `http://localhost:3001/docs` |

The two stable demo personas are:

| Persona | UUID |
| --- | --- |
| Alice | `10000000-0000-4000-8000-000000000001` |
| Bob | `10000000-0000-4000-8000-000000000002` |

### Environment variables

Backend:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://ledgerly:ledgerly@localhost:5432/ledgerly` |
| `DATABASE_SSL` | Enable TLS options for Neon | `false` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:3000` |
| `PORT` | API port | `3001` |
| `LOG_LEVEL` | Structured log threshold | `info` |

Frontend:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Browser-visible API origin | `http://localhost:3001` |

`NEXT_PUBLIC_API_BASE_URL` is embedded during the Next.js build and must be set before a Vercel production build.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health`, `/health/live`, `/health/ready` | Liveness and readiness |
| `POST` | `/wallets` | Create a customer wallet |
| `GET` | `/wallets?userId=<uuid>` | List a persona's wallets |
| `GET` | `/wallets/:id` | Read a wallet and decimal balance |
| `POST` | `/wallets/:id/deposit` | Deposit with `Idempotency-Key` |
| `POST` | `/transfers` | Transfer with `Idempotency-Key` |
| `GET` | `/wallets/:id/transactions` | Cursor-paginated history |

Swagger documents request DTOs, headers, responses, and stable error codes at `/docs`. API errors use:

```json
{
  "statusCode": 422,
  "code": "INSUFFICIENT_FUNDS",
  "message": "The source wallet has insufficient funds.",
  "requestId": "req-..."
}
```

## Database migrations

Schema synchronization is disabled in every environment.

```bash
pnpm --filter @ledgerly/backend migration:run
pnpm --filter @ledgerly/backend migration:revert
```

The initial migration creates the schema, constraints, indexes, clearing wallets, immutability trigger, and deferred balancing trigger.

## Verification

```bash
pnpm check
pnpm --filter @ledgerly/backend test:e2e
```

The unit suite covers decimal validation, hashing, API-client errors, mutation headers, frontend retry keys, money formatting, and cold-start messaging. The PostgreSQL end-to-end suite covers wallet uniqueness, INR/USD deposits, replay and payload conflicts, concurrent retries, transfers, overdraft prevention, rollback, immutable-ledger triggers, and stable cursor pagination.

GitHub Actions starts PostgreSQL 17, runs migrations, executes the full workspace check, and then runs database-backed end-to-end tests.

## Free-tier deployment

Production resources have not yet been provisioned. The repository is ready for the following account-owned setup.

### 1. Neon

1. Create a free Neon project in a region close to Render Singapore.
2. Copy its PostgreSQL connection string.
3. Use it as Render's `DATABASE_URL` and keep `DATABASE_SSL=true`.

The first Render start applies the pending migration and seeds exactly one INR and one USD clearing wallet.

### 2. Render

1. In Render, create a Blueprint from this repository's root [render.yaml](./render.yaml).
2. Set the secret `DATABASE_URL` to the Neon connection string.
3. Initially set `CORS_ORIGINS` to the Vercel production origin once known.
4. Deploy and verify `/health/ready` and `/docs` on the generated `onrender.com` URL.

Render reserves `preDeployCommand` for paid web services. The free-only `start:render` entry point therefore applies pending migrations before starting NestJS. It is scoped to the single free instance; local and CI flows still run migrations explicitly.

### 3. Vercel

1. Import this GitHub repository as a Vercel project.
2. Set the project Root Directory to `frontend`.
3. Add `NEXT_PUBLIC_API_BASE_URL` with the Render API origin.
4. Deploy, then update Render `CORS_ORIGINS` to the exact Vercel production origin and redeploy the API.

### 4. Smoke test

Verify health and Swagger, then create Alice and Bob wallets, deposit, transfer, retry the same request, and paginate history. Finally, let the Render service sleep and confirm that the frontend displays its startup message during the next cold start.

## Phase boundary

Redis, Kafka, Outbox, Saga, DLQ, reconciliation, distributed locks, Terraform-managed AWS resources, notification services, and audit services are deliberately deferred to Phase 2/3.
