const { query } = require('../config/db');

const mapAccountRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    currency: row.currency,
    balanceMinor: Number(row.balance_minor),
    status: row.status,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createAccount = async ({ userId, name, currency }) => {
  const sql = `
    INSERT INTO accounts (user_id, name, currency)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await query(sql, [userId, name, currency]);
  return mapAccountRow(result.rows[0]);
};

const findAllAccounts = async () => {
  const sql = `
    SELECT *
    FROM accounts
    WHERE is_system = FALSE
    ORDER BY created_at DESC;
  `;
  const result = await query(sql);
  return result.rows.map(mapAccountRow);
};

const findAccountById = async (id) => {
  const sql = `
    SELECT *
    FROM accounts
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return mapAccountRow(result.rows[0]);
};

const updateAccountStatus = async (id, status) => {
  const sql = `
    UPDATE accounts
    SET status = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const result = await query(sql, [status, id]);
  return mapAccountRow(result.rows[0]);
};

module.exports = {
  createAccount,
  findAllAccounts,
  findAccountById,
  updateAccountStatus,
};
