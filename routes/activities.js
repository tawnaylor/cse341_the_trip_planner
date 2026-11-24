// OWNER: Jacquelyn Kulmus
// Activities routes. Add GET, POST, PUT, and DELETE here
// Pattern: router.METHOD(path, isAuthenticated, validationRules, controller.fn)

// const controller = require('../controllers/activities');
// const validate = require('../validation/activities');
// const { isAuthenticated } = require('../middleware/authenticate');

// TODO (Jacquelyn): add routes
const router = require('express').Router();
const controller = require('../controllers/activities');
const validate = require('../validation/activities');
const { isAuthenticated } = require('../middleware/authenticate');

// An additional local check protects Activities while shared auth is a placeholder
function requireSession(req, res, next) {
  if (typeof req.isAuthenticated !== 'function' || !req.isAuthenticated() ||
      !/^[a-fA-F0-9]{24}$/.test(String(req.user?._id))) {
    return res.status(401).json({ message: 'Sign in is required' });
  }
  next();
}

router.get('/trips/:tripId/activities', isAuthenticated, requireSession,
  validate.tripIdRules, validate.handleValidation, (req, res) => {
    // #swagger.tags = ['Activities']
    // #swagger.summary = 'List activities for a trip, most votes first'
    // #swagger.description = 'Equal vote counts use activity ID order for a stable display. This does not select an itinerary winner'
    // #swagger.responses[200] = { description: 'Activities returned', schema: [{ $ref: '#/definitions/Activity' }] }
    return controller.getAll(req, res);
  });

router.get('/trips/:tripId/activities/:activityId', isAuthenticated, requireSession,
  validate.tripIdRules, validate.activityIdRules, validate.handleValidation, (req, res) => {
    // #swagger.tags = ['Activities']
    // #swagger.summary = 'Get one activity in a trip'
    // #swagger.responses[200] = { description: 'Activity returned.', schema: { $ref: '#/definitions/Activity' } }
    return controller.getOne(req, res);
  });

router.post('/trips/:tripId/activities', isAuthenticated, requireSession,
  validate.tripIdRules, validate.activityBodyRules, validate.handleValidation, (req, res) => {
    // #swagger.tags = ['Activities']
    // #swagger.summary = 'Suggest an activity for a trip'
    // #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ActivityInput' } }
    // #swagger.responses[201] = { description: 'Activity created.', schema: { $ref: '#/definitions/Activity' } }
    return controller.create(req, res);
  });

router.put('/trips/:tripId/activities/:activityId', isAuthenticated, requireSession,
  validate.tripIdRules, validate.activityIdRules, validate.activityBodyRules,
  validate.handleValidation, (req, res) => {
    // #swagger.tags = ['Activities']
    // #swagger.summary = 'Replace editable activity fields'
    // #swagger.description = 'Only the proposer or organizer may edit while the trip is planning. Omitted optional fields are removed. Votes and status are preserved'
    // #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ActivityInput' } }
    // #swagger.responses[200] = { description: 'Activity updated.', schema: { $ref: '#/definitions/Message' } }
    return controller.update(req, res);
  });

router.delete('/trips/:tripId/activities/:activityId', isAuthenticated, requireSession,
  validate.tripIdRules, validate.activityIdRules, validate.handleValidation, (req, res) => {
    // #swagger.tags = ['Activities']
    // #swagger.summary = 'Delete an activity'
    // #swagger.description = 'Only the proposer or organizer may delete while the trip is planning'
    // #swagger.responses[204] = { description: 'Activity deleted. No response body' }
    return controller.remove(req, res);
  });

router.put('/trips/:tripId/activities/:activityId/vote', isAuthenticated, requireSession,
  validate.tripIdRules, validate.activityIdRules, validate.voteBodyRules,
  validate.handleValidation, (req, res) => {
    // #swagger.tags = ['Activities']
    // #swagger.summary = 'Toggle your vote for an activity'
    // #swagger.description = 'Any signed-in trip member or organizer can vote while the trip is planning. No request body. First call adds your vote; next call removes it. Each user has at most one vote per activity and may vote on multiple activities. Every call toggles, including retries; check the activity before retrying an uncertain request. Winner selection happens separately when the itinerary is locked'
    // #swagger.autoBody = false
    // #swagger.responses[200] = { description: 'Vote added or removed.', schema: { $ref: '#/definitions/VoteResult' } }
    return controller.vote(req, res);
  });

module.exports = router;