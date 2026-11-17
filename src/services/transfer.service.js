const ledgerRepository = require('../repositories/ledger.repository');
const idempotencyRepository = require('../repositories/idempotency.repository');
const AppError = require('../utils/AppError');

const createTransfer = async ({
  fromAccountId,
  toAccountId,
  amountMinor,
  referenceNote,
  requesterUserId,
  idempotencyKey,
}) => {
  if (fromAccountId === toAccountId) {
    throw new AppError(
      'Cannot transfer funds to the same account',
      422,
      'SAME_ACCOUNT_TRANSFER'
    );
  }

  const requestHash = idempotencyRepository.computeRequestHash({
    fromAccountId,
    toAccountId,
    amountMinor,
    referenceNote,
  });

  
  const { isNew, record } = await idempotencyRepository.tryClaimIdempotencyKey({
    userId: requesterUserId,
    key: idempotencyKey,
    requestHash,
  });

  
  if (!isNew) {
   
    if (record.requestHash !== requestHash) {
      throw new AppError(
        'Idempotency-Key has already been used with different transfer parameters',
        422,
        'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
      );
    }

    
    if (record.responseStatus === null) {
      throw new AppError(
        'A transfer with this Idempotency-Key is currently in progress',
        409,
        'IDEMPOTENCY_KEY_IN_PROGRESS'
      );
    }

    
    return {
      isReplay: true,
      statusCode: record.responseStatus,
      responseBody: record.responseBody,
    };
  }

  
  try {
    const transferResult = await ledgerRepository.executeTransferTransaction({
      fromAccountId,
      toAccountId,
      amountMinor,
      referenceNote,
      requesterUserId,
    });

    const responseBody = {
      success: true,
      data: transferResult,
    };

    
    await idempotencyRepository.saveIdempotencyResponse({
      userId: requesterUserId,
      key: idempotencyKey,
      responseStatus: 201,
      responseBody,
    });

    return {
      isReplay: false,
      statusCode: 201,
      responseBody,
    };
  } catch (err) {
    await idempotencyRepository.releaseIdempotencyKey({
      userId: requesterUserId,
      key: idempotencyKey,
    });
    throw err;
  }
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
