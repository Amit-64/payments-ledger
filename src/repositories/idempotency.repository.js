const crypto = require('crypto');
const { query } = require('../config/db');

const mapIdempotencyRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    key: row.idempotency_key,
    userId: row.user_id,
    requestHash: row.request_hash,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
};


const computeRequestHash = ({
  fromAccountId,
  toAccountId,
  amountMinor,
  referenceNote = '',
}) => {
  const canonicalPayload = JSON.stringify({
    fromAccountId,
    toAccountId,
    amountMinor: Number(amountMinor),
    referenceNote: referenceNote.trim(),
  });

  return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
};


const tryClaimIdempotencyKey = async ({ userId, key, requestHash }) => {
  
  await query(
    `
    DELETE FROM idempotency_keys
    WHERE user_id = $1 AND idempotency_key = $2 AND expires_at <= NOW();
    `,
    [userId, key]
  );

 
  const insertResult = await query(
    `
    INSERT INTO idempotency_keys (idempotency_key, user_id, request_hash, response_status, response_body)
    VALUES ($1, $2, $3, NULL, NULL)
    ON CONFLICT (user_id, idempotency_key) DO NOTHING
    RETURNING *;
    `,
    [key, userId, requestHash]
  );

  if (insertResult.rowCount === 1) {
    return {
      isNew: true,
      record: mapIdempotencyRow(insertResult.rows[0]),
    };
  }

  const existingResult = await query(
    `
    SELECT *
    FROM idempotency_keys
    WHERE user_id = $1 AND idempotency_key = $2;
    `,
    [userId, key]
  );

  return {
    isNew: false,
    record: mapIdempotencyRow(existingResult.rows[0]),
  };
};

const saveIdempotencyResponse = async ({
  userId,
  key,
  responseStatus,
  responseBody,
}) => {
  const result = await query(
    `
    UPDATE idempotency_keys
    SET response_status = $1,
        response_body = $2
    WHERE user_id = $3 AND idempotency_key = $4
    RETURNING *;
    `,
    [responseStatus, responseBody, userId, key]
  );

  return mapIdempotencyRow(result.rows[0]);
};


const releaseIdempotencyKey = async ({ userId, key }) => {
  await query(
    `
    DELETE FROM idempotency_keys
    WHERE user_id = $1 AND idempotency_key = $2 AND response_status IS NULL;
    `,
    [userId, key]
  );
};

module.exports = {
  computeRequestHash,
  tryClaimIdempotencyKey,
  saveIdempotencyResponse,
  releaseIdempotencyKey,
};