const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'Mapa-UTEQ';

let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
      throw new Error('MONGO_URI is missing or invalid');
    }

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    cachedDb = client.db(DB_NAME);
    console.log(`✅ Conectado a MongoDB Atlas (${DB_NAME})`);
    return cachedDb;
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    throw err;
  }
};

module.exports = connectToDatabase;


