const HttpError = require('../utils/httpError');

// Validates req.body against a zod schema and replaces it with the cleaned result.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    return next(new HttpError(400, message));
  }
  req.body = result.data;
  next();
};

module.exports = validate;
