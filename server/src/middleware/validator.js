const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const firstError = errors.array()[0];
    return res.status(400).json({
      code: 400,
      message: firstError.msg
    });
  };
};

module.exports = {
  validate,
  body,
  param,
  query
};
