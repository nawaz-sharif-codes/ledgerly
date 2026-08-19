# Distributed Payment & Ledger Platform — Phase 1 Architecture Spec

**Purpose of this document:** hand this directly to Codex as the source-of-truth architecture reference before any code is generated. It should live at the project root alongside `AGENTS.md` and `DESIGN.md`.

---

## 1. Project overview

A simplified wallet/payment platform demonstrating production-grade backend engineering: double-entry ledger accounting, idempotent request handling, and clean service-boundary design — built as a phased project, starting with the core money-movement flow before adding distributed-systems resilience patterns (Outbox, Saga, DLQ, reconciliation) in later phases.

**Phase 1 goal:** a user can create a wallet, deposit money, transfer money to another wallet, and view transaction history — with every balance change backed by an immutable, balanced double-entry ledger, and every mutating request protected by idempotency keys.

### Approved Phase 1 decisions

- The data layer uses TypeORM with explicit migrations. Schema synchronization is disabled in every environment.
- Wallets support `INR` and `USD`. Currency conversion is not supported; transfers require matching currencies.
- Deposits balance against one platform-owned clearing wallet per currency.
- Ledger amounts are signed `NUMERIC(19,4)` values: debits are negative and credits are positive.
- Alice and Bob are stable demo personas identified by UUID. Phase 1 does not add authentication or a users table.
- Money is serialized across the API as decimal strings and calculated with `decimal.js`, never native floating-point numbers.

**Explicitly deferred to later phases:** Kafka/event bus, Outbox pattern, Saga pattern, DLQ, reconciliation jobs, distributed locking, separate notification/audit microservices. Do not scaffold infrastructure for these in Phase 1 — introducing them before there's a second service to coordinate with adds complexity with nothing yet to justify it.

---

## 2. Tech stack (all free-tier)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui | Hosted on Vercel (Hobby) |
| Backend | NestJS + TypeScript | Hosted on Render (free web service) — 512MB RAM/0.1 CPU, spins down after 15 min idle, 30–60s cold start |
| Database | PostgreSQL via Neon | Serverless, scale-to-zero, 0.5GB free, never expires |
| Cache/locking (introduced when needed, not necessarily Phase 1) | Upstash Redis | 256MB, 500K commands/month free |
| CI/CD | GitHub Actions | Free for public repos |
| IaC | Terraform | Targets free-tier AWS resources only (used from Phase 2 onward for SQS) |
| Observability | Structured logs (Phase 1) → New Relic free tier (later phases) | |

---

## 3. Phase 1 architecture diagram

```
        React UI (Next.js)
              │
              ▼
        NestJS API (single service, modular internally)
              │
    ┌─────────┼──────────┐
    ▼         ▼           ▼
 Wallet    Ledger     Idempotency
 Module    Module        Module
    │         │              │
    └─────────┴──────────────┘
              ▼
          PostgreSQL (Neon)
```

One deployed service, internally split into clean NestJS modules with explicit boundaries — not physically separate microservices yet. This is a deliberate choice: module boundaries demonstrate the same design thinking as service boundaries, without the operational overhead of running/deploying multiple services before there's a real reason to (e.g. independent scaling, independent deploys, event-driven decoupling — none of which apply yet in Phase 1).

---

## 4. Database schema (Phase 1)

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  wallet_type VARCHAR(20) NOT NULL, -- 'customer' | 'clearing'
  currency VARCHAR(3) NOT NULL, -- 'INR' | 'USD'
  balance_after NUMERIC(19,4) NOT NULL DEFAULT 0, -- cached snapshot, only ever updated inside the same transaction as a ledger write
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_wallet_owner CHECK (
    (wallet_type = 'customer' AND user_id IS NOT NULL) OR
    (wallet_type = 'clearing' AND user_id IS NULL)
  )
);

CREATE UNIQUE INDEX uq_customer_wallet_currency
  ON wallets(user_id, currency) WHERE wallet_type = 'customer';
CREATE UNIQUE INDEX uq_clearing_wallet_currency
  ON wallets(currency) WHERE wallet_type = 'clearing';

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'deposit' | 'transfer'
  status VARCHAR(20) NOT NULL, -- 'pending' | 'completed' | 'failed'
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  entry_type VARCHAR(10) NOT NULL, -- 'debit' | 'credit'
  amount NUMERIC(19,4) NOT NULL, -- signed: debit < 0, credit > 0
  balance_after NUMERIC(19,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL, -- hash of the request body, to detect key reuse with a different payload
  response_body JSONB,
  status VARCHAR(20) NOT NULL, -- 'in_progress' | 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_wallet ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_entries_transaction ON ledger_entries(transaction_id);
```

**Non-negotiable rule:** `ledger_entries` rows are immutable — never UPDATE or DELETE them. Every transaction produces at least one debit and one credit row whose amounts balance to zero across the transaction. `wallets.balance_after` is a cached read-optimization only, always written in the same DB transaction as the ledger rows it summarizes — never updated independently.

The initial migration enforces immutability with a trigger that rejects updates and deletes, and uses a deferred constraint trigger to verify each transaction sums to zero before commit. It also seeds exactly one INR clearing wallet and one USD clearing wallet.

---

## 5. API surface (Phase 1)

```
POST   /wallets                    Create a wallet
GET    /wallets/:id                Get wallet + current balance
POST   /wallets/:id/deposit        Deposit funds (requires Idempotency-Key header)
POST   /transfers                  Transfer between two wallets (requires Idempotency-Key header)
GET    /wallets/:id/transactions   Paginated transaction history
GET    /health                     Health check (used by the frontend's "waking up" state)
```

Wallet creation accepts `userId` plus `currency` (`INR` or `USD`). All request and response money values are decimal strings. Transaction history uses an opaque cursor ordered by `created_at DESC, id DESC`, with a default limit of 20 and maximum of 100.

### Idempotency handling (applies to `/deposit` and `/transfers`)

1. Client sends `Idempotency-Key` header (client-generated UUID) on every mutating request.
2. Server looks up the key in `idempotency_keys`:
   - **Found + status `completed`** → return the stored `response_body` immediately, do not reprocess.
   - **Found + status `in_progress`** → return `409 Conflict` (a concurrent retry of the same in-flight request).
   - **Found + different `request_hash`** → return `422` (key reuse with a different payload — a client bug, not a legitimate retry).
   - **Not found** → proceed to step 3.
3. Insert the idempotency key row as `in_progress` **inside the same database transaction** as the wallet/ledger writes. Commit together. On success, update the row to `completed` with the response body still inside that same transaction (or immediately after, in a way that's safe on retry).

This ordering is the detail that actually matters: if the idempotency record and the ledger write aren't atomic together, a crash between the two re-opens the exact double-processing bug idempotency exists to prevent.

---

## 6. NestJS module structure

```
src/
  wallets/
    wallets.controller.ts
    wallets.service.ts
    wallets.module.ts
    entities/wallet.entity.ts
  ledger/
    ledger.service.ts       # shared double-entry write logic, called by wallets & transfers
    ledger.module.ts
    entities/ledger-entry.entity.ts
    entities/transaction.entity.ts
  idempotency/
    idempotency.interceptor.ts   # NestJS interceptor wrapping mutating endpoints
    idempotency.service.ts
    idempotency.module.ts
    entities/idempotency-key.entity.ts
  transfers/
    transfers.controller.ts
    transfers.service.ts
    transfers.module.ts
  database/
    data-source.ts
    migrations/
  health/
    health.controller.ts
  app.module.ts
```

`LedgerService` is the single place that writes ledger entries — `WalletsService` (deposit) and a future `TransfersService` both call into it rather than writing ledger rows directly. This keeps the double-entry invariant enforced in one place.

---

## 7. Frontend structure (Phase 1)

```
app/
  layout.tsx
  page.tsx                    # dashboard: wallet balance + recent transactions
  wallets/[id]/page.tsx        # wallet detail + transaction history
  transfer/page.tsx            # transfer form
components/
  ui/                          # shadcn primitives
  wallet-balance-card.tsx
  transaction-list.tsx
  transfer-form.tsx
  server-status-indicator.tsx  # "waking up the server" loading state
lib/
  api-client.ts                # wraps fetch with idempotency-key generation + 60-90s timeout on first call
  demo-personas.ts             # stable Alice and Bob UUIDs
DESIGN.md                      # design tokens, at project root
AGENTS.md                      # agent build rules, at project root
```

**`server-status-indicator.tsx` behavior:** on app mount, ping `GET /health`. If it hasn't resolved within ~1–2 seconds, show a visible status message ("Starting up the server — this can take up to a minute on the free tier") with a spinner, rather than a blank/frozen UI. The API client should use an extended timeout (60–90s) for the first request in a session specifically, since a cold Render instance won't respond until it's fully awake.

---

## 8. Non-functional rules for Codex (mirror these into AGENTS.md)

- Every mutating endpoint requires and validates an `Idempotency-Key` header — reject with `400` if missing.
- `ledger_entries` are append-only. No UPDATE or DELETE statements against that table anywhere in the codebase.
- All monetary amounts use `NUMERIC`/decimal types end to end — never floating point — in both the database and TypeScript (use a decimal library, not native `number`, for arithmetic).
- Every wallet/ledger write path is wrapped in a single DB transaction (wallet balance update + ledger entries + idempotency key write all commit together or not at all).
- Structured logging (JSON) on every request, including a request ID, for later correlation once observability tooling is added.
- Follow DESIGN.md for all UI styling; use shadcn/ui primitives for interactive components; every interactive component needs hover/focus/active/disabled states; every page needs a working layout at 375px/768px/1280px; every data view handles loading/empty/error states explicitly.

---

## 9. Roadmap beyond Phase 1 (for context, not to build yet)

- **Phase 2:** split out a Notification service, introduce an event bus (Upstash Kafka or AWS SQS free tier), implement the Transactional Outbox pattern for reliably publishing ledger events.
- **Phase 3:** Saga pattern for multi-step flows (e.g. payment + refund), dead-letter queue handling for failed event processing, reconciliation jobs comparing ledger state against an external source of truth, distributed locking (Redis) for concurrent-transfer race conditions, audit log service.

Do not begin Phase 2/3 work until Phase 1 is fully functional, tested, and deployed.
