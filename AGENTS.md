# Agent Instructions — Distributed Payment & Ledger Platform

## Reference documents
- Read `payment-ledger-platform-architecture.md` at the project root before generating any code. It defines the schema, API contract, module structure, and phase scope. Treat it as authoritative.
- Read `DESIGN.md` at the project root for all colors, typography, spacing, and component styling. Never invent visual style outside of it.

## Current phase
We are in **Phase 1 only**: wallet creation, deposit, transfer, double-entry ledger, idempotency keys, transaction history. Do not build Kafka/event bus, Outbox pattern, Saga pattern, DLQ, reconciliation jobs, distributed locking, or separate notification/audit services yet — those are Phase 2/3 and out of scope until explicitly requested.

## Money & ledger rules (non-negotiable)
- All monetary amounts use `NUMERIC`/decimal types end to end. Never use native floating-point `number` for arithmetic on money — use a decimal library (e.g. `decimal.js`) in TypeScript, and `NUMERIC` in PostgreSQL.
- `ledger_entries` rows are append-only. Never write an UPDATE or DELETE statement against that table, anywhere in the codebase.
- Every transaction produces balanced debit and credit entries that sum to zero.
- `wallets.balance_after` is a cached read-optimization only. It is written exclusively inside the same database transaction as the ledger entries it summarizes — never updated independently, never updated outside a transaction.
- `LedgerService` is the only place that writes ledger entries. `WalletsService` and any future `TransfersService` call into it rather than writing ledger rows directly.

## Idempotency rules (non-negotiable)
- Every mutating endpoint (`POST /wallets/:id/deposit`, `POST /transfers`) requires an `Idempotency-Key` header. Reject with `400` if it's missing.
- On each request: look up the key in `idempotency_keys`.
  - Found + `completed` → return the stored response, do not reprocess.
  - Found + `in_progress` → return `409 Conflict`.
  - Found + a different request hash than what's stored → return `422`.
  - Not found → proceed, and insert the idempotency key row as `in_progress` **inside the same database transaction** as the wallet/ledger writes. Commit together.
- Do not implement idempotency checking and the actual ledger write as two separate, non-atomic operations. That defeats the purpose.

## Transactions & consistency
- Every wallet/ledger write path (deposit, transfer) is wrapped in a single database transaction: wallet balance update + ledger entries + idempotency key write all commit together or not at all.

## Frontend rules
- Use shadcn/ui primitives from `components/ui/` for every interactive element (buttons, inputs, forms, dialogs, dropdowns). Do not hand-write a new component from scratch if an existing primitive covers it.
- Every interactive component must implement hover, focus, active, and disabled states. Not optional.
- Every page must have a working layout at 375px (mobile), 768px (tablet), and 1280px (desktop).
- Every data-driven view handles three states explicitly: loading, empty, and error — not just the happy path.
- Implement a `server-status-indicator` component: on app mount, ping `GET /health`. If it hasn't resolved within ~1–2 seconds, show a visible "Starting up the server — this can take up to a minute on the free tier" message with a spinner. The API client must use an extended timeout (60–90s) for the first request in a session, since the backend runs on a free tier that spins down when idle.
- Never hardcode a hex color, font size, or spacing value outside of the Tailwind theme tokens generated from `DESIGN.md`.

## Workflow rules
- Before building any new page or component, check `/style-guide` for existing components. Reuse them. Only add a new component variant if the style guide is updated first, in the same change.
- The first task in this project should be a `/style-guide` route rendering every shadcn component in every state it supports, styled with `DESIGN.md` tokens. Do not build product pages before this exists and has been reviewed.
- Structured (JSON) logging on every backend request, including a request ID, for future correlation once observability tooling is added.
- If a requested change conflicts with the money/ledger rules or idempotency rules above, stop and flag it instead of implementing a workaround.

## Out of scope for now
- Authentication/authorization beyond what's minimally needed to associate a wallet with a `user_id` — do not build a full auth system unless asked.
- Multi-currency conversion logic.
- Any UI or backend code for Phase 2/3 features listed in the architecture doc.
