# Ledgerly

Ledgerly is a production-minded wallet and payment platform built around an immutable, double-entry ledger. The project begins as a modular monolith so the core money-movement invariants can be proven before distributed infrastructure is introduced.

## Start here

These root documents are part of the initial repository baseline and govern all implementation work:

- [AGENTS.md](./AGENTS.md) — non-negotiable engineering and workflow rules.
- [DESIGN.md](./DESIGN.md) — visual tokens, typography, spacing, and component rules.
- [payment-ledger-platform-architecture.md](./payment-ledger-platform-architecture.md) — Phase 1 architecture, schema, APIs, and boundaries.

Read all three before contributing. `AGENTS.md` and the architecture specification are authoritative when a generated scaffold or framework default conflicts with the project rules.

## Repository structure

```text
ledgerly/
├── frontend/   # Next.js App Router, Tailwind, and shadcn/ui
├── backend/    # NestJS API using Fastify
├── packages/   # Reserved for future shared contracts and tooling
└── .github/    # Continuous integration workflows
```

Turborepo is used only to orchestrate root-level commands across `frontend` and `backend`. It does not determine the application structure.

## Current scope

The repository is in Phase 1. The first frontend deliverable is the token-backed component style guide at `/style-guide`; product pages will follow only after the style guide is reviewed.

The current backend exposes:

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- Swagger UI at `/docs`

Payment, wallet, ledger, database, Redis, event bus, and later-phase infrastructure are not part of this bootstrap commit.

## Local development

Prerequisites:

- Node.js 24 (`.nvmrc` pins the local version)
- pnpm 10.28.2 through Corepack

Install and configure:

```bash
corepack enable
pnpm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Run both applications:

```bash
pnpm dev
```

- Frontend: `http://localhost:3000/style-guide`
- Backend: `http://localhost:3001/health`
- API documentation: `http://localhost:3001/docs`

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the complete verification sequence with `pnpm check`.

## Publishing the repository

The repository is intended to be public. On a machine with Homebrew:

```bash
brew install gh
gh auth login
git init -b main
git add .
git commit -m "chore: bootstrap ledgerly monorepo"
gh repo create ledgerly --public --source=. --remote=origin --push
```

The initial commit includes this README and all three governing root documents listed above.
