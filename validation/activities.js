// OWNER: Jacquelyn Kulmus
// Activities validation rules (express-validator). Return 400 when rules fail.
// const { body, param, validationResult } = require('express-validator');

// TODO (Jacquelyn Kulmus): add validation rules

const { body, param, validationResult } = require('express-validator');

const tripIdRules = [
  param('tripId').isMongoId().withMessage('A valid trip ID is required')
];
const activityIdRules = [
  param('activityId').isMongoId().withMessage('A valid activity ID is required')
];
// The voter always comes from the authenticated session, never the request body
const voteBodyRules = [
  body().custom((value) => value === undefined || (
    value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 0
  )).withMessage('Voting takes no request body; the signed-in user supplies the vote')
];
const activityBodyRules = [
  body().custom((value) => {
    const allowed = ['title', 'description', 'date', 'estimatedCost'];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('The request body must be a JSON object');
    }
    if (Object.keys(value).some((key) => !allowed.includes(key))) {
      throw new Error('Only title, description, date, and estimatedCost are allowed');
    }
    return true;
  }),
  body('title').isString().withMessage('Title must be text').bail()
    .trim().notEmpty().withMessage('Title is required'),
  body('description').optional().isString()
    .withMessage('Description must be text.').bail().trim(),
  body('date').optional().isString()
    .withMessage('Date must be text in YYYY-MM-DD format').bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Use YYYY-MM-DD for the date').bail()
    .isISO8601({ strict: true }).withMessage('Provide a valid calendar date'),
  body('estimatedCost').optional()
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .withMessage('Estimated cost must be a number zero or greater')
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: errors.array().map((error) => ({
        field: error.path || 'body', message: error.msg
      }))
    });
  }
  next();
}

module.exports = { tripIdRules, activityIdRules, activityBodyRules, voteBodyRules, handleValidation };