// server.js - Servidor local para API de destinos (Mejorado)
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

// Ruta de diagnóstico de base de datos
app.get('/api/diagnostico', async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    // Verificar colecciones disponibles
    const collections = await db.listCollections().toArray();
    console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
    
    // Verificar colección destinos
    const destinosCollection = db.collection('destinos');
    const count = await destinosCollection.countDocuments();
    console.log(`📍 Documentos en colección 'destinos': ${count}`);
    
    // Obtener algunos documentos de muestra
    const samples = await destinosCollection.find().limit(3).toArray();
    console.log('📋 Documentos de muestra:', samples);
    
    res.json({
      success: true,
      diagnostico: {
        conexion: 'OK',
        baseDatos: dbName,
        colecciones: collections.map(c => c.name),
        destinosCount: count,
        muestras: samples
      }
    });
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      message: 'Error en diagnóstico',
      error: error.message
    });
  }
});

// GET /api/destinos - Obtener todos los destinos (Mejorado)
app.get('/api/destinos', async (req, res) => {
  try {
    console.log('🔍 Obteniendo destinos...');
    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');
    
    // Verificar que la colección existe
    const collections = await db.listCollections({name: 'destinos'}).toArray();
    if (collections.length === 0) {
      console.log('⚠️  La colección "destinos" no existe');
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'La colección "destinos" no existe aún'
      });
    }
    
    const destinos = await destinosCollection.find().sort({ id: 1 }).toArray();
    const count = destinos.length;
    
    console.log(`✅ Encontrados ${count} destinos`);
    
    res.json({
      success: true,
      count,
      data: destinos
    });
  } catch (error) {
    console.error('❌ Error al obtener destinos:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// POST /api/destinos - Crear nuevo destino (Mejorado)
app.post('/api/destinos', async (req, res) => {
  try {
    console.log('📝 Creando nuevo destino:', req.body);
    const { id, nombre, posicion } = req.body;
    
    // Validaciones
    if (!id || !nombre || !posicion || !posicion.latitude || !posicion.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos (id, nombre, posicion.latitude, posicion.longitude)'
      });
    }

    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');

    // Verificar que el ID no exista
    const existingDestino = await destinosCollection.findOne({ id: id.toString() });
    if (existingDestino) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un destino con este ID'
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

    const nuevoDestino = {
      id: id.toString(),
      nombre: nombre.trim(),
      posicion: {
        latitude: lat,
        longitude: lng
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await destinosCollection.insertOne(nuevoDestino);
    console.log('✅ Destino creado:', result.insertedId);
    
    res.status(201).json({
      success: true,
      message: 'Destino creado correctamente',
      data: {
        _id: result.insertedId,
        ...nuevoDestino
      }
    });
  } catch (error) {
    console.error('❌ Error al crear destino:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// POST /api/destinos/seed - Crear datos de prueba
app.post('/api/destinos/seed', async (req, res) => {
  try {
    console.log('🌱 Creando datos de prueba...');
    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');
    
    // Limpiar colección existente
    await destinosCollection.deleteMany({});
    
    const destinosPrueba = [
      {
        id: "1",
        nombre: "Caseta de Control 1: Acceso Principal",
        posicion: {
          latitude: 20.5881,
          longitude: -100.3889
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "2", 
        nombre: "Caseta de Control 2: Acceso a Estacionamiento",
        posicion: {
          latitude: 20.5885,
          longitude: -100.3895
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "3",
        nombre: "Punto de Control 3: Área Administrativa",
        posicion: {
          latitude: 20.5890,
          longitude: -100.3900
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const result = await destinosCollection.insertMany(destinosPrueba);
    console.log('✅ Datos de prueba insertados:', result.insertedIds);
    
    res.json({
      success: true,
      message: 'Datos de prueba creados correctamente',
      inserted: result.insertedIds,
      count: destinosPrueba.length
    });
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// GET /api/destinos/:id - Obtener destino específico
app.get('/api/destinos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando destino con ID: ${id}`);
    
    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');

    let destino;
    if (ObjectId.isValid(id)) {
      destino = await destinosCollection.findOne({ _id: new ObjectId(id) });
    } else {
      destino = await destinosCollection.findOne({ id: id.toString() });
    }

    if (!destino) {
      return res.status(404).json({
        success: false,
        message: 'Destino no encontrado'
      });
    }

    console.log('✅ Destino encontrado:', destino);
    res.json({
      success: true,
      data: destino
    });
  } catch (error) {
    console.error('❌ Error al obtener destino:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// PUT /api/destinos/:id - Actualizar destino
app.put('/api/destinos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, posicion } = req.body;
    
    console.log(`📝 Actualizando destino ID: ${id}`, req.body);
    
    if (!nombre || !posicion || !posicion.latitude || !posicion.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos (nombre, posicion.latitude, posicion.longitude)'
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
    const destinosCollection = db.collection('destinos');

    const updateData = {
      nombre: nombre.trim(),
      posicion: {
        latitude: lat,
        longitude: lng
      },
      updatedAt: new Date()
    };

    let updateResult;
    if (ObjectId.isValid(id)) {
      updateResult = await destinosCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    } else {
      updateResult = await destinosCollection.updateOne(
        { id: id.toString() },
        { $set: updateData }
      );
    }

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Destino no encontrado'
      });
    }

    console.log('✅ Destino actualizado');
    res.json({
      success: true,
      message: 'Destino actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar destino:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// DELETE /api/destinos/:id - Eliminar destino
app.delete('/api/destinos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️  Eliminando destino ID: ${id}`);
    
    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');

    let deleteResult;
    if (ObjectId.isValid(id)) {
      deleteResult = await destinosCollection.deleteOne({ _id: new ObjectId(id) });
    } else {
      deleteResult = await destinosCollection.deleteOne({ id: id.toString() });
    }

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Destino no encontrado'
      });
    }

    console.log('✅ Destino eliminado');
    res.json({
      success: true,
      message: 'Destino eliminado correctamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar destino:', error);
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
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/test',
      'GET /api/diagnostico',
      'GET /api/destinos',
      'POST /api/destinos',
      'POST /api/destinos/seed',
      'GET /api/destinos/:id',
      'PUT /api/destinos/:id',
      'DELETE /api/destinos/:id'
    ]
  });
});

// Inicializar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
  console.log(`🧪 Prueba la API en http://localhost:${PORT}/api/test`);
  console.log(`🔍 Diagnóstico en http://localhost:${PORT}/api/diagnostico`);
  console.log(`🌱 Crear datos de prueba: POST http://localhost:${PORT}/api/destinos/seed`);
  
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