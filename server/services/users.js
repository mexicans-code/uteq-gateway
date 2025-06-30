
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3006;

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'NovaCode';

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


app.get('/api/users', checkDbConnection, async (req, res) => {
    try {
        const users = await db.collection('users').find().toArray();
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});

  // Obtener un solo usuario por ID
  app.get('/api/users/:id', checkDbConnection, async (req, res) => {
    try {
      const userId = req.params.id;
      const ObjectId = require('mongodb').ObjectId;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
  
      const { contraseña, ...userWithoutPassword } = user;
  
      res.status(200).json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      res.status(500).json({ success: false, message: 'Error del servidor' });
    }
  });

connectToDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(` Users Service running on port ${PORT}`);
    });
});

