-- Autonomous replacement for the dedicated VS RF Firebase supply register.
CREATE TABLE supply_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 location text NOT NULL CHECK(location IN ('RLS','VS','OB7')),
 recipient text NOT NULL CHECK(length(recipient) BETWEEN 1 AND 120),
 status text NOT NULL CHECK(status IN ('DELIVERED','NOT_DELIVERED')),
 trucks_planned integer NOT NULL CHECK(trucks_planned BETWEEN 0 AND 99),
 trucks_arrived integer NOT NULL CHECK(trucks_arrived BETWEEN 0 AND trucks_planned),
 escort_status text NOT NULL CHECK(escort_status IN ('YES','NO','UNKNOWN')),
 event_at timestamptz NOT NULL,
 comment text NOT NULL DEFAULT '' CHECK(length(comment)<=1000),
 organizations jsonb NOT NULL,
 total integer NOT NULL CHECK(total BETWEEN 0 AND 9990),
 revision integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL REFERENCES users(id),
 updated_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 webhook_requested boolean NOT NULL DEFAULT false,
 idempotency_key uuid NOT NULL,
 UNIQUE(created_by,idempotency_key)
);
CREATE INDEX supply_ledger_event_idx ON supply_ledger(event_at DESC,id);
CREATE TABLE supply_ledger_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 supply_id uuid NOT NULL REFERENCES supply_ledger(id),
 actor_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL CHECK(action IN ('create','update','delete','restore','send')),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX supply_ledger_history_supply_idx ON supply_ledger_history(supply_id,id);
