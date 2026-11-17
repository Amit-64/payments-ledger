ALTER TABLE idempotency_keys
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours');

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
ON idempotency_keys (expires_at);