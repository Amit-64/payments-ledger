const accountService = require('../services/account.service');

const createAccount = async (req, res, next) => {
  try {
    const { name, currency } = req.body;

    const account = await accountService.createAccount({
      userId: req.user.id,
      name,
      currency,
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

const listAccounts = async (req, res, next) => {
  try {
    const accounts = await accountService.listAccounts(req.user.id);

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (err) {
    next(err);
  }
};

const getAccountById = async (req, res, next) => {
  try {
    const account = await accountService.getAccountById(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

const updateAccountStatus = async (req, res, next) => {
  try {
    const updatedAccount = await accountService.updateAccountStatus(
      req.params.id,
      req.user.id,
      req.body.status
    );

    res.status(200).json({
      success: true,
      data: updatedAccount,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAccount,
  listAccounts,
  getAccountById,
  updateAccountStatus,
};
