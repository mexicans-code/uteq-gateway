require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3003;

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'Mapa-UTEQ';

let db;

// Middleware
app.use(cors());
app.use(express.json());

// Verifica conexión a la base de datos antes de continuar
const checkDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ message: 'Database connection not established' });
  }
  next();
};

// Conexión a MongoDB
const connectToDatabase = async () => {
  try {
    if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
      throw new Error('MONGO_URI is missing or invalid in .env');
    }

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(` Conectado a MongoDB Atlas (${DB_NAME})`);
  } catch (err) {
    console.error(' Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

app.get('/api/events', checkDbConnection, async (req, res) => {
  try {
    const eventsCollection = db.collection('events');
    const events = await eventsCollection.find().toArray();
    res.json(events);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ message: 'Error al obtener eventos' });
  }
});

connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(` Events Service running on port ${PORT}`);
  });
});
