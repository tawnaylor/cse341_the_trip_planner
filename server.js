require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/connect');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// TODO (Member 1): add express-session and passport setup here, before the routes.
//   app.use(session({ ... }));
//   app.use(passport.initialize());
//   app.use(passport.session());

app.use('/', routes);

// These two stay last.
app.use(notFound);
app.use(errorHandler);

// Only connect and listen when run directly (npm start).
// Tests import the app without starting the server or touching MongoDB.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  initDb()
    .then(() => {
      app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch((err) => {
      console.error('Could not connect to MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
