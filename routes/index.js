// OWNER: Jacquelyn Kulmus
// Mounts every route file and the Swagger docs.
const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger-generated.json');

router.get('/', (req, res) => {
  res.json({ message: 'Group Trip Planner API', docs: '/api-docs' });
});

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// TODO (Member 1): mount auth routes, for example router.use('/auth', require('./auth'));

router.use('/users', require('./users'));
router.use('/', require('./activities'));
router.use('/trips', require('./trips'));
router.use('/', require('./expenses'));

module.exports = router;
