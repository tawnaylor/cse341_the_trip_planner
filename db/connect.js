// OWNER: Member 2
// MongoDB connection helper. Call initDb() once at startup, then getDb() anywhere.
const { MongoClient } = require('mongodb');

let db;

const initDb = async () => {
  if (db) return db;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME || 'groupTripPlanner');
  console.log('Connected to MongoDB');
  return db;
};

const getDb = () => {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
};

module.exports = { initDb, getDb };
