// ===== api/destinos.js (versión corregida) =====
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'Mapa-UTEQ';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurado');
    }

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    cachedDb = client.db(DB_NAME);
    console.log(`✅ Conectado a MongoDB Atlas (${DB_NAME})`);
    return cachedDb;
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err);
    throw err;
  }
}

// AQUÍ ESTABA EL PROBLEMA - faltaba la función handler
async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test sin DB primero
    if (req.query.test === 'simple') {
      return res.status(200).json({ 
        message: 'API destinos funcionando sin DB',
        timestamp: new Date().toISOString()
      });
    }

    const db = await connectToDatabase();
    
    if (req.method === 'GET') {
      const destinosCollection = db.collection('destinos');
      const destinos = await destinosCollection.find().toArray();
      
      res.status(200).json({
        success: true,
        count: destinos.length,
        data: destinos
      });
    } 
    else if (req.method === 'POST') {
      const nuevoDestino = req.body;
      const destinosCollection = db.collection('destinos');
      const result = await destinosCollection.insertOne(nuevoDestino);
      
      res.status(201).json({
        success: true,
        insertedId: result.insertedId
      });
    }
    else {
      res.status(405).json({ 
        error: 'Método no permitido',
        allowedMethods: ['GET', 'POST'] 
      });
    }
  } catch (error) {
    console.error('❌ Error en /api/destinos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;