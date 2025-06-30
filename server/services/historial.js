require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3008;

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
    console.log(`🔗 Conectado a MongoDB Atlas (${DB_NAME})`);
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

// POST - Crear nuevo registro en historial
app.post('/api/historial', checkDbConnection, async (req, res) => {
  try {
    const historialCollection = db.collection('historial');
    const nuevoRegistro = {
      nombre: req.body.nombre,
      dia: req.body.dia,
      hora: req.body.hora,
      tipo: req.body.tipo,
      userId: req.body.userId,
    };
    
    await historialCollection.insertOne(nuevoRegistro);
    res.status(201).json({ mensaje: 'Guardado en historial' });
  } catch (error) {
    console.error('Error al guardar historial:', error);
    res.status(500).json({ error: 'Error al guardar historial' });
  }
});

// GET - Obtener todos los registros del historial
app.get('/api/historial', checkDbConnection, async (req, res) => {
  try {
    const historialCollection = db.collection('historial');
    const data = await historialCollection.find().sort({ _id: -1 }).toArray();
    res.json(data);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// DELETE - Eliminar registro por ID
app.delete('/api/historial/:id', checkDbConnection, async (req, res) => {
  try {
    const historialCollection = db.collection('historial');
    const { id } = req.params;
    
    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const result = await historialCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    res.json({ mensaje: 'Registro eliminado' });
  } catch (error) {
    console.error('Error al eliminar registro:', error);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});



// GET - Obtener todos los registros del historial por usuario (VERSION DEBUG)
app.get('/api/historial/usuario/:userId', checkDbConnection, async (req, res) => {
  try {
    const historialCollection = db.collection('historial');
    const { userId } = req.params;
    
    console.log('=== DEBUG INICIO ===');
    console.log('Buscando historial para userId:', userId);
    console.log('Tipo de userId:', typeof userId);
    
    // Validar que el userId sea un ObjectId válido
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    // PASO 1: Ver todos los documentos en la colección
    const todosLosDocumentos = await historialCollection.find({}).limit(5).toArray();
    console.log('Primeros 5 documentos en la colección:', JSON.stringify(todosLosDocumentos, null, 2));
    
    // PASO 2: Ver si existe algún documento con ese userId exacto
    const busquedaExacta = await historialCollection.findOne({ userId: userId });
    console.log('Búsqueda exacta (string):', busquedaExacta);
    
    // PASO 3: Ver si existe con ObjectId
    const busquedaObjectId = await historialCollection.findOne({ userId: new ObjectId(userId) });
    console.log('Búsqueda ObjectId:', busquedaObjectId);
    
    // PASO 4: Buscar todos los valores únicos del campo userId
    const valoresUserId = await historialCollection.distinct('userId');
    console.log('Todos los valores de userId en la colección:', valoresUserId);
    console.log('Tipos de userId encontrados:', valoresUserId.map(id => ({ valor: id, tipo: typeof id })));
    
    // PASO 5: Hacer la búsqueda normal
    const result = await historialCollection
      .find({ userId: userId })
      .toArray();
    
    console.log(`Encontrados ${result.length} registros para usuario ${userId}`);
    console.log('=== DEBUG FIN ===');
    
    res.json(result);
  } catch (error) {
    console.error('Error al obtener historial del usuario:', error);
    res.status(500).json({ error: 'Error al obtener historial del usuario' });
  }
});



connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Historial Service running on port ${PORT}`);
  });
});