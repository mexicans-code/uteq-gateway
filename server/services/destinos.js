require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3007;

// MongoDB Connection URL
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'Mapa-UTEQ';

let db;

// Middleware
app.use(cors());
app.use(express.json());


const connectToDatabase = async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(` Conectado a MongoDB Atlas (${DB_NAME})`);
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  }
};

const checkDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ message: 'Database connection not established' });
  }
  next();
};

// Ruta para obtener los destinos
app.get('/api/destinos', checkDbConnection, async (req, res) => {
  try {
    const destinosCollection = db.collection('destinos');
    const destinos = await destinosCollection.find().toArray();
    res.json(destinos);
  } catch (error) {
    console.error('Error al obtener destinos:', error);
    res.status(500).json({ message: 'Error al obtener destinos' });
  }
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(` Destinos Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to start service:', err);
  });


