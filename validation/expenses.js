// Expenses validation rules (express-validator). Return 400 when rules fail.
const { body, param, validationResult } = require('express-validator');

const CATEGORIES = ['lodging', 'food', 'transport', 'activity', 'other'];
const SPLIT_TYPES = ['equal', 'percentage', 'custom'];

const idParam = (name) => [param(name).isMongoId().withMessage(`${name} must be a valid ObjectId`)];

const expenseBody = [
  body('description').isString().withMessage('description must be text').bail()
    .trim().isLength({ min: 2, max: 100 }).withMessage('description must be 2-100 characters'),
  body('amountCents').isInt({ min: 1, max: 100000000000 })
    .withMessage('amountCents must be a positive whole number of cents').toInt(),
  body('paidBy').isMongoId().withMessage('paidBy must be a valid ObjectId'),
  body('splitType').isIn(SPLIT_TYPES).withMessage(`splitType must be one of: ${SPLIT_TYPES.join(', ')}`),
  body('splits').optional().isArray().withMessage('splits must be an array'),
  body('splits.*.userId').isMongoId().withMessage('splits.userId must be a valid ObjectId'),
  body('splits.*.percent').optional().isFloat({ gt: 0, max: 100 })
    .withMessage('splits.percent must be greater than 0 and at most 100').toFloat(),
  body('splits.*.amountCents').optional().isInt({ min: 0, max: 100000000000 })
    .withMessage('splits.amountCents must be a whole number of cents').toInt(),
  // Percentage and custom splits need one entry per person with the matching field.
  body('splits').custom((splits, { req }) => {
    const { splitType } = req.body;
    if (splitType !== 'percentage' && splitType !== 'custom') return true;
    const field = splitType === 'percentage' ? 'percent' : 'amountCents';
    if (!Array.isArray(splits) || splits.length === 0) {
      throw new Error(`splits are required for a ${splitType} split`);
    }
    if (!splits.every((s) => s && s[field] !== undefined)) {
      throw new Error(`every split needs a ${field} for a ${splitType} split`);
    }
    return true;
  }),
  body('category').isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),
  body('date').isISO8601().withMessage('date must be an ISO 8601 date'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

module.exports = { idParam, expenseBody, handleValidation };
