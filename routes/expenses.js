// Expenses routes.
// Pattern: router.METHOD(path, isAuthenticated, requireSession, validationRules, controller.fn)
const router = require('express').Router();
const controller = require('../controllers/expenses');
const { idParam, expenseBody, handleValidation } = require('../validation/expenses');
const { isAuthenticated } = require('../middleware/authenticate');

// The shared isAuthenticated is still a pass-through, so also require a session user here.
const { requireSession } = controller;

router.get('/trips/:tripId/expenses', isAuthenticated, requireSession,
  idParam('tripId'), handleValidation, (req, res) => {
    // #swagger.tags = ['Expenses']
    // #swagger.summary = 'List a trip expenses, newest first'
    // #swagger.responses[200] = { description: 'Expenses returned', schema: [{ $ref: '#/definitions/Expense' }] }
    return controller.listByTrip(req, res);
  });

router.get('/trips/:tripId/settlement', isAuthenticated, requireSession,
  idParam('tripId'), handleValidation, (req, res) => {
    // #swagger.tags = ['Expenses']
    // #swagger.summary = 'Balances and who pays whom'
    // #swagger.description = 'Positive balances are owed money, negative balances owe money. All amounts are in cents'
    // #swagger.responses[200] = { description: 'Balances and payments', schema: { $ref: '#/definitions/Settlement' } }
    return controller.settlement(req, res);
  });

router.post('/trips/:tripId/expenses', isAuthenticated, requireSession,
  idParam('tripId'), expenseBody, handleValidation, (req, res) => {
    // #swagger.tags = ['Expenses']
    // #swagger.summary = 'Log an expense'
    // #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ExpenseInput' } }
    // #swagger.responses[201] = { description: 'Expense created', schema: { $ref: '#/definitions/Expense' } }
    return controller.create(req, res);
  });

router.get('/expenses/:id', isAuthenticated, requireSession,
  idParam('id'), handleValidation, (req, res) => {
    // #swagger.tags = ['Expenses']
    // #swagger.summary = 'Get one expense'
    // #swagger.responses[200] = { description: 'Expense returned', schema: { $ref: '#/definitions/Expense' } }
    return controller.getOne(req, res);
  });

router.put('/expenses/:id', isAuthenticated, requireSession,
  idParam('id'), expenseBody, handleValidation, (req, res) => {
    // #swagger.tags = ['Expenses']
    // #swagger.summary = 'Replace an expense'
    // #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ExpenseInput' } }
    // #swagger.responses[200] = { description: 'Expense updated', schema: { $ref: '#/definitions/Expense' } }
    return controller.update(req, res);
  });

router.delete('/expenses/:id', isAuthenticated, requireSession,
  idParam('id'), handleValidation, (req, res) => {
    // #swagger.tags = ['Expenses']
    // #swagger.summary = 'Delete an expense'
    // #swagger.responses[200] = { description: 'Expense deleted', schema: { $ref: '#/definitions/Message' } }
    return controller.remove(req, res);
  });

module.exports = router;
