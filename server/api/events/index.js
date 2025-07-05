// server.js - Servidor local para API de eventos (Corregido)
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de MongoDB
const uri = process.env.MONGO_URI || 'mongodb+srv://2023171035:UJfzTuvjiwG4HYKG@cluster0.ugps9.mongodb.net/NovaCode';
const dbName = process.env.DB_NAME || 'NovaCode';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  try {
    console.log('🔄 Conectando a MongoDB...');
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(dbName);
    
    // Verificar conexión
    await db.admin().ping();
    console.log('✅ Ping a base de datos exitoso');
    
    cachedClient = client;
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

// GET /api/events - Obtener todos los eventos
app.get('/api/events', async (req, res) => {
  try {
    console.log('🔍 Obteniendo eventos...');
    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');
    
    // Verificar que la colección existe
    const collections = await db.listCollections({name: 'events'}).toArray();
    if (collections.length === 0) {
      console.log('⚠️  La colección "events" no existe');
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'La colección "events" no existe aún'
      });
    }
    
    const events = await eventsCollection.find().sort({ id: 1 }).toArray();
    const count = events.length;
    
    console.log(`✅ Encontrados ${count} eventos`);
    
    res.json({
      success: true,
      count,
      data: events
    });
  } catch (error) {
    console.error('❌ Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// POST /api/events - Crear nuevo evento
app.post('/api/events', async (req, res) => {
  try {
    console.log('📝 Creando nuevo evento:', req.body);
    const { id, nombre, fecha, lugar, imagen, posicion } = req.body;
    
    // Validaciones
    if (!id || !nombre || !fecha || !lugar) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos (id, nombre, fecha, lugar, imagen, posicion.latitude, posicion.longitude)'
      });
    }

    if (!posicion || !posicion.latitude || !posicion.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Las coordenadas de posición son requeridas'
      });
    }

    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');

    // Verificar que el ID no exista
    const existingEvent = await eventsCollection.findOne({ id: id.toString() });
    if (existingEvent) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un evento con este ID'
      });
    }

    // Validar coordenadas
    const lat = parseFloat(posicion.latitude);
    const lng = parseFloat(posicion.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Las coordenadas deben ser números válidos'
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas fuera de rango válido'
      });
    }

    const nuevoEvento = {
      id: id.toString(),
      nombre: nombre.trim(),
      posicion: {
        latitude: lat,
        longitude: lng
      },
      fecha: fecha,
      lugar: lugar.trim(),
      imagen: imagen || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await eventsCollection.insertOne(nuevoEvento);
    console.log('✅ Evento creado:', result.insertedId);
    
    res.status(201).json({
      success: true,
      message: 'Evento creado correctamente',
      data: {
        _id: result.insertedId,
        ...nuevoEvento
      }
    });
  } catch (error) {
    console.error('❌ Error al crear evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// GET /api/events/:id - Obtener evento por ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando evento con ID: ${id}`);
    
    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');

    let evento;
    if (ObjectId.isValid(id)) {
      evento = await eventsCollection.findOne({ _id: new ObjectId(id) });
    } else {
      evento = await eventsCollection.findOne({ id: id.toString() });
    }

    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    console.log('✅ Evento encontrado:', evento);
    res.json({
      success: true,
      data: evento
    });
  } catch (error) {
    console.error('❌ Error al obtener evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// PUT /api/events/:id - Actualizar evento
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, fecha, lugar, imagen, posicion } = req.body;
    
    console.log(`📝 Actualizando evento ID: ${id}`, req.body);
    
    if (!nombre || !lugar || !posicion || !posicion.latitude || !posicion.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos (nombre, lugar, imagen, posicion.latitude, posicion.longitude)'
      });
    }

    // Validar coordenadas
    const lat = parseFloat(posicion.latitude);
    const lng = parseFloat(posicion.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Las coordenadas deben ser números válidos'
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas fuera de rango válido'
      });
    }

    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');

    const updateData = {
      nombre: nombre.trim(),
      posicion: {
        latitude: lat,
        longitude: lng
      },
      lugar: lugar.trim(),
      imagen: imagen || '',
      updatedAt: new Date()
    };

    // Incluir fecha si se proporciona
    if (fecha) {
      updateData.fecha = fecha;
    }

    let updateResult;
    if (ObjectId.isValid(id)) {
      updateResult = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    } else {
      updateResult = await eventsCollection.updateOne(
        { id: id.toString() },
        { $set: updateData }
      );
    }

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    console.log('✅ Evento actualizado');
    res.json({
      success: true,
      message: 'Evento actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// DELETE /api/events/:id - Eliminar evento
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️  Eliminando evento ID: ${id}`);
    
    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');

    let deleteResult;
    if (ObjectId.isValid(id)) {
      deleteResult = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    } else {
      deleteResult = await eventsCollection.deleteOne({ id: id.toString() });
    }

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    console.log('✅ Evento eliminado');
    res.json({
      success: true,
      message: 'Evento eliminado correctamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta de diagnóstico
app.get('/api/diagnostico', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collections = await db.listCollections().toArray();
    const eventsCollection = db.collection('events');
    const eventCount = await eventsCollection.countDocuments();
    
    res.json({
      success: true,
      database: dbName,
      collections: collections.map(col => col.name),
      eventCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Inicializar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
  console.log(`🧪 Prueba la API en http://localhost:${PORT}/api/test`);
  console.log(`🔍 Diagnóstico en http://localhost:${PORT}/api/diagnostico`);
  console.log(`🌱 Crear datos de prueba: POST http://localhost:${PORT}/api/events/`);
  
  // Intentar conectar a la base de datos al iniciar
  try {
    await connectToDatabase();
    console.log('✅ Conexión inicial a MongoDB exitosa');
  } catch (error) {
    console.error('❌ Error en conexión inicial:', error);
  }
});

// Manejo de errores del servidor
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Cerrar conexión al terminar el proceso
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  if (cachedClient) {
    await cachedClient.close();
    console.log('✅ Conexión a MongoDB cerrada');
  }
  process.exit(0);
});