const { query, getClient } = require('../config/db');
const AppError = require('../utils/AppError');

const mapTransferRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    status: row.status,
    transferType: row.transfer_type,
    referenceNote: row.reference_note,
    reversedTransferId: row.reversed_transfer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapLedgerEntryRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    transferId: row.transfer_id,
    accountId: row.account_id,
    entryType: row.entry_type,
    amountMinor: Number(row.amount_minor),
    createdAt: row.created_at,
  };
};


const executeDepositTransaction = async ({
  systemAccountId,
  destinationAccountId,
  amountMinor,
  currency,
  referenceNote,
}) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const orderedIds = [systemAccountId, destinationAccountId].sort();
    await client.query(
      `SELECT id FROM accounts WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE;`,
      orderedIds
    );

  
    const transferResult = await client.query(
      `
      INSERT INTO transfers (
        from_account_id,
        to_account_id,
        amount_minor,
        currency,
        status,
        transfer_type,
        reference_note
      )
      VALUES ($1, $2, $3, $4, 'COMPLETED', 'DEPOSIT', $5)
      RETURNING *;
      `,
      [
        systemAccountId,
        destinationAccountId,
        amountMinor,
        currency,
        referenceNote || 'Account Deposit',
      ]
    );
    const transfer = mapTransferRow(transferResult.rows[0]);

    const ledgerResult = await client.query(
      `
      INSERT INTO ledger_entries (transfer_id, account_id, entry_type, amount_minor)
      VALUES
        ($1, $2, 'DEBIT', $3),
        ($1, $4, 'CREDIT', $5)
      RETURNING *;
      `,
      [
        transfer.id,
        systemAccountId,
        -amountMinor,
        destinationAccountId,
        amountMinor,
      ]
    );

    await client.query(
      `
      UPDATE accounts
      SET balance_minor = balance_minor - $1,
          updated_at = NOW()
      WHERE id = $2;
      `,
      [amountMinor, systemAccountId]
    );


    const updatedAccountResult = await client.query(
      `
      UPDATE accounts
      SET balance_minor = balance_minor + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, balance_minor, currency, status, updated_at;
      `,
      [amountMinor, destinationAccountId]
    );

    await client.query('COMMIT');

    const updatedAccount = updatedAccountResult.rows[0];

    return {
      transfer,
      entries: ledgerResult.rows.map(mapLedgerEntryRow),
      account: {
        id: updatedAccount.id,
        balanceMinor: Number(updatedAccount.balance_minor),
        currency: updatedAccount.currency,
        status: updatedAccount.status,
        updatedAt: updatedAccount.updated_at,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const executeTransferTransaction = async ({
  fromAccountId,
  toAccountId,
  amountMinor,
  referenceNote,
  requesterUserId,
}) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    
    const orderedIds = [fromAccountId, toAccountId].sort();
    const lockResult = await client.query(
      `
      SELECT *
      FROM accounts
      WHERE id IN ($1, $2) AND is_system = FALSE
      ORDER BY id ASC
      FOR UPDATE;
      `,
      orderedIds
    );

    const fromAccount = lockResult.rows.find((row) => row.id === fromAccountId);
    const toAccount = lockResult.rows.find((row) => row.id === toAccountId);

    if (!fromAccount) {
      throw new AppError(
        `Source account ${fromAccountId} not found`,
        404,
        'SOURCE_ACCOUNT_NOT_FOUND'
      );
    }

    if (!toAccount) {
      throw new AppError(
        `Destination account ${toAccountId} not found`,
        404,
        'DESTINATION_ACCOUNT_NOT_FOUND'
      );
    }

    
    if (fromAccount.user_id !== requesterUserId) {
      throw new AppError(
        'You do not have permission to transfer funds from this account',
        403,
        'FORBIDDEN_SOURCE_ACCOUNT'
      );
    }

    
    if (fromAccount.status !== 'ACTIVE') {
      throw new AppError(
        `Source account is ${fromAccount.status} and cannot send funds`,
        422,
        'SOURCE_ACCOUNT_NOT_ACTIVE'
      );
    }

    if (toAccount.status !== 'ACTIVE') {
      throw new AppError(
        `Destination account is ${toAccount.status} and cannot receive funds`,
        422,
        'DESTINATION_ACCOUNT_NOT_ACTIVE'
      );
    }

    
    if (fromAccount.currency !== toAccount.currency) {
      throw new AppError(
        `Currency mismatch: cannot transfer between ${fromAccount.currency} and ${toAccount.currency} accounts`,
        422,
        'CURRENCY_MISMATCH'
      );
    }

    
    const currentFromBalance = Number(fromAccount.balance_minor);
    if (currentFromBalance < amountMinor) {
      throw new AppError(
        `Insufficient funds: available balance is ${currentFromBalance}, requested ${amountMinor}`,
        422,
        'INSUFFICIENT_FUNDS'
      );
    }

    
    const transferResult = await client.query(
      `
      INSERT INTO transfers (
        from_account_id,
        to_account_id,
        amount_minor,
        currency,
        status,
        transfer_type,
        reference_note
      )
      VALUES ($1, $2, $3, $4, 'COMPLETED', 'TRANSFER', $5)
      RETURNING *;
      `,
      [
        fromAccountId,
        toAccountId,
        amountMinor,
        fromAccount.currency,
        referenceNote || 'Peer-to-Peer Transfer',
      ]
    );
    const transfer = mapTransferRow(transferResult.rows[0]);

    const ledgerResult = await client.query(
      `
      INSERT INTO ledger_entries (transfer_id, account_id, entry_type, amount_minor)
      VALUES
        ($1, $2, 'DEBIT', $3),
        ($1, $4, 'CREDIT', $5)
      RETURNING *;
      `,
      [
        transfer.id,
        fromAccountId,
        -amountMinor,
        toAccountId,
        amountMinor,
      ]
    );

  
    const updatedFromResult = await client.query(
      `
      UPDATE accounts
      SET balance_minor = balance_minor - $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, balance_minor, currency, status, updated_at;
      `,
      [amountMinor, fromAccountId]
    );

    // 9. Credit receiver's cached balance
    const updatedToResult = await client.query(
      `
      UPDATE accounts
      SET balance_minor = balance_minor + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, balance_minor, currency, status, updated_at;
      `,
      [amountMinor, toAccountId]
    );

    await client.query('COMMIT');

    const updatedFrom = updatedFromResult.rows[0];
    const updatedTo = updatedToResult.rows[0];

    return {
      transfer,
      entries: ledgerResult.rows.map(mapLedgerEntryRow),
      fromAccount: {
        id: updatedFrom.id,
        balanceMinor: Number(updatedFrom.balance_minor),
        currency: updatedFrom.currency,
      },
      toAccount: {
        id: updatedTo.id,
        balanceMinor: Number(updatedTo.balance_minor),
        currency: updatedTo.currency,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


const findTransferById = async (transferId) => {
  const transferResult = await query(
    `
    SELECT t.*,
           fa.user_id AS from_user_id,
           ta.user_id AS to_user_id
    FROM transfers t
    JOIN accounts fa ON t.from_account_id = fa.id
    JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.id = $1;
    `,
    [transferId]
  );

  if (transferResult.rowCount === 0) return null;

  const row = transferResult.rows[0];
  const entriesResult = await query(
    `
    SELECT *
    FROM ledger_entries
    WHERE transfer_id = $1
    ORDER BY entry_type ASC;
    `,
    [transferId]
  );

  return {
    transfer: mapTransferRow(row),
    entries: entriesResult.rows.map(mapLedgerEntryRow),
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
  };
};


const getAccountLedgerAndSum = async (accountId) => {
  const entriesResult = await query(
    `
    SELECT *
    FROM ledger_entries
    WHERE account_id = $1
    ORDER BY created_at DESC;
    `,
    [accountId]
  );

  const sumResult = await query(
    `
    SELECT COALESCE(SUM(amount_minor), 0) AS ledger_sum_minor
    FROM ledger_entries
    WHERE account_id = $1;
    `,
    [accountId]
  );

  return {
    entries: entriesResult.rows.map(mapLedgerEntryRow),
    ledgerSumMinor: Number(sumResult.rows[0].ledger_sum_minor),
  };
};

module.exports = {
  executeDepositTransaction,
  executeTransferTransaction,
  findTransferById,
  getAccountLedgerAndSum,
};
