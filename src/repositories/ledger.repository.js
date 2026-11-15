const { query, getClient } = require('../config/db');

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
  getAccountLedgerAndSum,
};
