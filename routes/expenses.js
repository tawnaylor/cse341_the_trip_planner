// Expenses routes.
// Pattern: router.METHOD(path, isAuthenticated, validationRules, controller.fn)
const router = require('express').Router();
const controller = require('../controllers/expenses');
const { idParam, expenseBody, handleValidation } = require('../validation/expenses');
const { isAuthenticated } = require('../middleware/authenticate');

router.get('/trips/:tripId/expenses', isAuthenticated, idParam('tripId'), handleValidation, controller.listByTrip);
router.get('/trips/:tripId/settlement', isAuthenticated, idParam('tripId'), handleValidation, controller.settlement);
router.post('/trips/:tripId/expenses', isAuthenticated, idParam('tripId'), expenseBody, handleValidation, controller.create);
router.get('/expenses/:id', isAuthenticated, idParam('id'), handleValidation, controller.getOne);
router.put('/expenses/:id', isAuthenticated, idParam('id'), expenseBody, handleValidation, controller.update);
router.delete('/expenses/:id', isAuthenticated, idParam('id'), handleValidation, controller.remove);

module.exports = router;
