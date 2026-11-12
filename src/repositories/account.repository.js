const crypto = require('crypto');

const accountsStore = [];

const createAccount = async ({ userId, name, currency }) => {
  const now = new Date().toISOString();

  const newAccount = {
    id: crypto.randomUUID(),
    userId,
    name,
    currency,
    balanceMinor: 0, 
    status: 'ACTIVE', // ACTIVE | FROZEN | CLOSED
    createdAt: now,
    updatedAt: now,
  };

  accountsStore.push(newAccount);
  return newAccount;
};

const findAllAccounts = async () => {
  return accountsStore;
};

const findAccountById = async (id) => {
  const account = accountsStore.find((acc) => acc.id === id);
  return account || null;
};

const updateAccountStatus = async (id, status) => {
  const account = accountsStore.find((acc) => acc.id === id);
  if (!account) {
    return null;
  }

  account.status = status;
  account.updatedAt = new Date().toISOString();
  return account;
};

module.exports = {
  createAccount,
  findAllAccounts,
  findAccountById,
  updateAccountStatus,
};
