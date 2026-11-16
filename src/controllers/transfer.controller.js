const transferService = require('../services/transfer.service');

const createTransfer = async (req, res, next) => {
  try {
    const { fromAccountId, toAccountId, amountMinor, referenceNote } = req.body;

    const result = await transferService.createTransfer({
      fromAccountId,
      toAccountId,
      amountMinor,
      referenceNote,
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

module.exports = {
  createTransfer,
  getTransferById,
};
