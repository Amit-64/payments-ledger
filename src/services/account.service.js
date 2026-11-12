const accountRepository = require('../repositories/account.repository');
const AppError = require('../utils/AppError');

const createAccount = async ({ userId, name, currency = 'INR' }) => {
  const account = await accountRepository.createAccount({
    userId,
    name,
    currency: currency.toUpperCase(),
  });

  return account;
};

const listAccounts = async () => {
  return await accountRepository.findAllAccounts();
};

const getAccountById = async (accountId) => {
  const account = await accountRepository.findAccountById(accountId);

  if (!account) {
    throw new AppError(
      `Account with ID ${accountId} not found`,
      404,
      'ACCOUNT_NOT_FOUND'
    );
  }

  return account;
};

const updateAccountStatus = async (accountId, status) => {
  // First verify the account exists (throws 404 if not found)
  const existingAccount = await getAccountById(accountId);

  if (existingAccount.status === 'CLOSED') {
    throw new AppError(
      'Cannot change status of a CLOSED account',
      422,
      'ACCOUNT_ALREADY_CLOSED'
    );
  }

  return await accountRepository.updateAccountStatus(accountId, status);
};

module.exports = {
  createAccount,
  listAccounts,
  getAccountById,
  updateAccountStatus,
};
