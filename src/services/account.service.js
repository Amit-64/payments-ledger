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

const listAccounts = async (userId) => {
  return await accountRepository.findAccountsByUserId(userId);
};

const getAccountById = async (accountId, userId) => {
  const account = await accountRepository.findAccountById(accountId);

  if (!account) {
    throw new AppError(
      `Account with ID ${accountId} not found`,
      404,
      'ACCOUNT_NOT_FOUND'
    );
  }


  if (account.userId !== userId) {
    throw new AppError(
      'You do not have permission to access this account',
      403,
      'FORBIDDEN_ACCOUNT_ACCESS'
    );
  }

  return account;
};

const updateAccountStatus = async (accountId, userId, status) => {

  const existingAccount = await getAccountById(accountId, userId);

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
