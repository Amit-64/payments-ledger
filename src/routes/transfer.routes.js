const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth.middleware');
const transferController = require('../controllers/transfer.controller');

const router = express.Router();

router.use(requireAuth);

const createTransferSchema = Joi.object({
  fromAccountId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  toAccountId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  amountMinor: Joi.number().integer().positive().max(100000000000).required(),
  referenceNote: Joi.string().trim().max(255).optional(),
});

const transferIdParamSchema = Joi.object({
  id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

router.post(
  '/',
  validate(createTransferSchema, 'body'),
  transferController.createTransfer
);

router.get(
  '/:id',
  validate(transferIdParamSchema, 'params'),
  transferController.getTransferById
);

module.exports = router;
