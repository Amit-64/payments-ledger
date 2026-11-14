const { query } = require('../config/db');

const mapUserRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createUser = async ({ email, passwordHash, fullName }) => {
  const sql = `
    INSERT INTO users (email, password_hash, full_name)
    VALUES ($1, $2, $3)
    RETURNING id, email, full_name, created_at, updated_at;
  `;
  const result = await query(sql, [email, passwordHash, fullName]);
  const user = mapUserRow(result.rows[0]);
  delete user.passwordHash;
  return user;
};

const findUserByEmail = async (email) => {
  const sql = `
    SELECT *
    FROM users
    WHERE email = $1;
  `;
  const result = await query(sql, [email]);
  return mapUserRow(result.rows[0]);
};

const findUserById = async (id) => {
  const sql = `
    SELECT id, email, full_name, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  const user = mapUserRow(result.rows[0]);
  if (user) delete user.passwordHash;
  return user;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};
