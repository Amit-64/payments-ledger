const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id, 
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

const register = async ({ email, password, fullName }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await userRepository.findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new AppError(
      'An account with this email already exists',
      409,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  
  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  const newUser = await userRepository.createUser({
    email: normalizedEmail,
    passwordHash,
    fullName: fullName.trim(),
  });


  const accessToken = generateAccessToken(newUser);

  return {
    user: newUser,
    accessToken,
  };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

 
  const user = await userRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS'
    );
  }

 
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS'
    );
  }


  delete user.passwordHash;

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
  };
};

module.exports = {
  register,
  login,
};
