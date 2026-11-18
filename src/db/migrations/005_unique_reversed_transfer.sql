CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_unique_reversal
ON transfers (reversed_transfer_id)
WHERE reversed_transfer_id IS NOT NULL;
