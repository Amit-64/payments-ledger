const transferService = require('../services/transfer.service');
const AppError = require('../utils/AppError');

const createTransfer = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key']?.trim();

    if (!idempotencyKey) {
      throw new AppError(
        'Idempotency-Key header is required for all transfer requests',
        400,
        'IDEMPOTENCY_KEY_REQUIRED'
      );
    }

    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw new AppError(
        'Idempotency-Key header must be between 8 and 128 characters',
        400,
        'INVALID_IDEMPOTENCY_KEY'
      );
    }

    const { fromAccountId, toAccountId, amountMinor, referenceNote } = req.body;

    const { isReplay, statusCode, responseBody } =
      await transferService.createTransfer({
        fromAccountId,
        toAccountId,
        amountMinor,
        referenceNote,
        requesterUserId: req.user.id,
        idempotencyKey,
      });

    res.set('X-Idempotent-Replay', isReplay ? 'true' : 'false');
    res.status(statusCode).json(responseBody);
  } catch (err) {
    next(err);
  }
};

const getTransferById = async (req, res, next) => {
  try {
    const result = await transferService.getTransferById(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const reverseTransfer = async (req, res, next) => {
    try {
      const result = await transferService.reverseTransfer({
        transferId: req.params.id,
        reason: req.body.reason,
        requesterUserId: req.user.id,
      });
  
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
  
  module.exports = {
    createTransfer,
    getTransferById,
    reverseTransfer,
  };
  
