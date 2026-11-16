const ledgerRepository = require('../repositories/ledger.repository');
const AppError = require('../utils/AppError');

const createTransfer = async ({
  fromAccountId,
  toAccountId,
  amountMinor,
  referenceNote,
  requesterUserId,
}) => {
  
  if (fromAccountId === toAccountId) {
    throw new AppError(
      'Cannot transfer funds to the same account',
      422,
      'SAME_ACCOUNT_TRANSFER'
    );
  }

  return await ledgerRepository.executeTransferTransaction({
    fromAccountId,
    toAccountId,
    amountMinor,
    referenceNote,
    requesterUserId,
  });
};

const getTransferById = async (transferId, requesterUserId) => {
  const result = await ledgerRepository.findTransferById(transferId);

  if (!result) {
    throw new AppError(
      `Transfer with ID ${transferId} not found`,
      404,
      'TRANSFER_NOT_FOUND'
    );
  }

  
  const isSender = result.fromUserId === requesterUserId;
  const isReceiver = result.toUserId === requesterUserId;

  if (!isSender && !isReceiver) {
    throw new AppError(
      'You do not have permission to view this transfer',
      403,
      'FORBIDDEN_TRANSFER_ACCESS'
    );
  }

  return {
    transfer: result.transfer,
    entries: result.entries,
  };
};

module.exports = {
  createTransfer,
  getTransferById,
};
