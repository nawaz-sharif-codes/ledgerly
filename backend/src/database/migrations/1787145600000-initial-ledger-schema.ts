import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialLedgerSchema1787145600000 implements MigrationInterface {
  name = 'InitialLedgerSchema1787145600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "wallet_type" varchar(20) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "balance_after" numeric(19,4) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "chk_wallet_type" CHECK ("wallet_type" IN ('customer', 'clearing')),
        CONSTRAINT "chk_wallet_currency" CHECK ("currency" IN ('INR', 'USD')),
        CONSTRAINT "chk_wallet_owner" CHECK (
          ("wallet_type" = 'customer' AND "user_id" IS NOT NULL) OR
          ("wallet_type" = 'clearing' AND "user_id" IS NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_customer_wallet_currency"
      ON "wallets" ("user_id", "currency")
      WHERE "wallet_type" = 'customer'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_clearing_wallet_currency"
      ON "wallets" ("currency")
      WHERE "wallet_type" = 'clearing'
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL,
        "idempotency_key" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_transaction_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "chk_transaction_type" CHECK ("type" IN ('deposit', 'transfer')),
        CONSTRAINT "chk_transaction_status" CHECK ("status" IN ('pending', 'completed', 'failed'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "wallet_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "entry_type" varchar(10) NOT NULL,
        "amount" numeric(19,4) NOT NULL,
        "balance_after" numeric(19,4) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ledger_entries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ledger_wallet" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id"),
        CONSTRAINT "fk_ledger_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id"),
        CONSTRAINT "chk_entry_type" CHECK ("entry_type" IN ('debit', 'credit')),
        CONSTRAINT "chk_entry_amount_sign" CHECK (
          ("entry_type" = 'debit' AND "amount" < 0) OR
          ("entry_type" = 'credit' AND "amount" > 0)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ledger_entries_wallet" ON "ledger_entries" ("wallet_id", "created_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ledger_entries_transaction" ON "ledger_entries" ("transaction_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "key" varchar(255) NOT NULL,
        "request_hash" varchar(64) NOT NULL,
        "response_body" jsonb,
        "status" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_idempotency_keys" PRIMARY KEY ("key"),
        CONSTRAINT "chk_idempotency_status" CHECK ("status" IN ('in_progress', 'completed'))
      )
    `);

    await queryRunner.query(`
      CREATE FUNCTION reject_ledger_entry_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'ledger_entries are append-only';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_ledger_entries_immutable"
      BEFORE UPDATE OR DELETE ON "ledger_entries"
      FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation()
    `);

    await queryRunner.query(`
      CREATE FUNCTION assert_transaction_balanced()
      RETURNS trigger AS $$
      DECLARE
        total numeric(19,4);
      BEGIN
        SELECT COALESCE(SUM("amount"), 0)
        INTO total
        FROM "ledger_entries"
        WHERE "transaction_id" = NEW."transaction_id";

        IF total <> 0 THEN
          RAISE EXCEPTION 'transaction % is not balanced: %', NEW."transaction_id", total;
        END IF;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER "trg_ledger_entries_balanced"
      AFTER INSERT ON "ledger_entries"
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION assert_transaction_balanced()
    `);

    await queryRunner.query(`
      INSERT INTO "wallets" ("id", "user_id", "wallet_type", "currency", "balance_after")
      VALUES
        ('00000000-0000-4000-8000-000000000001', NULL, 'clearing', 'INR', 0),
        ('00000000-0000-4000-8000-000000000002', NULL, 'clearing', 'USD', 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_ledger_entries_balanced" ON "ledger_entries"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS assert_transaction_balanced`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_ledger_entries_immutable" ON "ledger_entries"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS reject_ledger_entry_mutation`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
  }
}
