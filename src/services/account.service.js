const accountRepository = require('../repositories/account.repository');
const ledgerRepository = require('../repositories/ledger.repository');
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

const depositToAccount = async ({
  accountId,
  userId,
  amountMinor,
  referenceNote,
}) => {
 
  const account = await getAccountById(accountId, userId);

  if (account.status !== 'ACTIVE') {
    throw new AppError(
      `Cannot deposit into an account with status ${account.status}`,
      422,
      'ACCOUNT_NOT_ACTIVE'
    );
  }

  
  const systemAccount = await accountRepository.findSystemAccountByCurrency(
    account.currency
  );

  if (!systemAccount) {
    throw new AppError(
      `System reserve account for currency ${account.currency} is not configured`,
      500,
      'SYSTEM_RESERVE_MISSING'
    );
  }

  
  return await ledgerRepository.executeDepositTransaction({
    systemAccountId: systemAccount.id,
    destinationAccountId: account.id,
    amountMinor,
    currency: account.currency,
    referenceNote,
  });
};

const getAccountLedger = async (accountId, userId) => {
  
  const account = await getAccountById(accountId, userId);

  
  const { entries, ledgerSumMinor } =
    await ledgerRepository.getAccountLedgerAndSum(account.id);

  return {
    accountId: account.id,
    currency: account.currency,
    cachedBalanceMinor: account.balanceMinor,
    ledgerSumMinor,
    isBalanced: account.balanceMinor === ledgerSumMinor,
    entryCount: entries.length,
    entries,
  };
};

module.exports = {
  createAccount,
  listAccounts,
  getAccountLedger,
  depositToAccount,
  getAccountById,
  updateAccountStatus,
};
