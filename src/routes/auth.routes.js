const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const authController = require('../controllers/auth.controller');

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().max(255).required(),
  password: Joi.string().min(8).max(72).required(),
  fullName: Joi.string().trim().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().max(255).required(),
  password: Joi.string().min(1).max(72).required(),
});

router.post('/register', validate(registerSchema, 'body'), authController.register);
router.post('/login', validate(loginSchema, 'body'), authController.login);

module.exports = router;
