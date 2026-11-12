const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const accountController = require('../controllers/account.controller');

const router = express.Router();


const createAccountSchema = Joi.object({
  userId: Joi.string().trim().min(1).max(100).optional(),
  name: Joi.string().trim().min(2).max(100).required(),
  currency: Joi.string().trim().uppercase().valid('INR', 'USD').default('INR'),
});

const accountIdParamSchema = Joi.object({
  id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().trim().uppercase().valid('ACTIVE', 'FROZEN', 'CLOSED').required(),
});

router.post('/', validate(createAccountSchema, 'body'), accountController.createAccount);
router.get('/', accountController.listAccounts);
router.get('/:id', validate(accountIdParamSchema, 'params'), accountController.getAccountById);
router.patch(
  '/:id/status',
  validate(accountIdParamSchema, 'params'),
  validate(updateStatusSchema, 'body'),
  accountController.updateAccountStatus
);

module.exports = router;
