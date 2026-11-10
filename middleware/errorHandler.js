// OWNER: Member 4
// Starter version so the server has a 404 and a 500 response from day one.
// TODO (Member 4): expand as needed and add errorHandler.spec.js.

const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express needs all four arguments to treat this as an error handler.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
};

module.exports = { notFound, errorHandler };
