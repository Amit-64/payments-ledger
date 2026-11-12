const AppError = require('../utils/AppError');


const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, 
      stripUnknown: true, 
    });

    if (error) {
      const details = error.details.map((d) => d.message).join('; ');
      return next(new AppError(details, 400, 'VALIDATION_ERROR'));
    }

   
    req[property] = value;
    next();
  };
};

module.exports = validate;
