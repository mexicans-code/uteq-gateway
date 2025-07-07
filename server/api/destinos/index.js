// ===== api/destinos.js (versión convertida a handler) =====
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'NovaCode';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurado');
    }
    
    console.log('🔄 Conectando a MongoDB...');
    const client = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(DB_NAME);
    
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

async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Ruta de prueba simple
    if (req.query.test === 'simple') {
      return res.status(200).json({
        message: 'API destinos funcionando sin DB',
        timestamp: new Date().toISOString()
      });
    }

    // Ruta de diagnóstico
    if (req.query.diagnostico === 'true') {
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
      
      return res.json({
        success: true,
        diagnostico: {
          conexion: 'OK',
          baseDatos: DB_NAME,
          colecciones: collections.map(c => c.name),
          destinosCount: count,
          muestras: samples
        }
      });
    }

    // Ruta para crear datos de prueba
    if (req.query.seed === 'true' && req.method === 'POST') {
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
      
      return res.json({
        success: true,
        message: 'Datos de prueba creados correctamente',
        inserted: result.insertedIds,
        count: destinosPrueba.length
      });
    }

    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');

    // Obtener ID específico de la URL
    const pathSegments = req.url.split('/').filter(Boolean);
    const isSpecificId = pathSegments.length > 2; // api/destinos/[id]
    const destinoId = isSpecificId ? pathSegments[2] : null;

    if (req.method === 'GET') {
      if (destinoId) {
        // GET /api/destinos/:id - Obtener destino específico
        console.log(`🔍 Buscando destino con ID: ${destinoId}`);
        
        let destino;
        if (ObjectId.isValid(destinoId)) {
          destino = await destinosCollection.findOne({ _id: new ObjectId(destinoId) });
        } else {
          destino = await destinosCollection.findOne({ id: destinoId.toString() });
        }

        if (!destino) {
          return res.status(404).json({
            success: false,
            message: 'Destino no encontrado'
          });
        }

        console.log('✅ Destino encontrado:', destino);
        return res.json({
          success: true,
          data: destino
        });
      } else {
        // GET /api/destinos - Obtener todos los destinos
        console.log('🔍 Obteniendo destinos...');
        
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
        
        return res.json({
          success: true,
          count,
          data: destinos
        });
      }
    }

    else if (req.method === 'POST') {
      // POST /api/destinos - Crear nuevo destino
      console.log('📝 Creando nuevo destino:', req.body);
      const { id, nombre, posicion } = req.body;
      
      // Validaciones
      if (!id || !nombre || !posicion || !posicion.latitude || !posicion.longitude) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos (id, nombre, posicion.latitude, posicion.longitude)'
        });
      }

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
      
      return res.status(201).json({
        success: true,
        message: 'Destino creado correctamente',
        data: {
          _id: result.insertedId,
          ...nuevoDestino
        }
      });
    }

    else if (req.method === 'PUT') {
      // PUT /api/destinos/:id - Actualizar destino
      if (!destinoId) {
        return res.status(400).json({
          success: false,
          message: 'ID de destino requerido'
        });
      }

      const { nombre, posicion } = req.body;
      
      console.log(`📝 Actualizando destino ID: ${destinoId}`, req.body);
      
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

      const updateData = {
        nombre: nombre.trim(),
        posicion: {
          latitude: lat,
          longitude: lng
        },
        updatedAt: new Date()
      };

      let updateResult;
      if (ObjectId.isValid(destinoId)) {
        updateResult = await destinosCollection.updateOne(
          { _id: new ObjectId(destinoId) },
          { $set: updateData }
        );
      } else {
        updateResult = await destinosCollection.updateOne(
          { id: destinoId.toString() },
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
      return res.json({
        success: true,
        message: 'Destino actualizado correctamente'
      });
    }

    else if (req.method === 'DELETE') {
      // DELETE /api/destinos/:id - Eliminar destino
      if (!destinoId) {
        return res.status(400).json({
          success: false,
          message: 'ID de destino requerido'
        });
      }

      console.log(`🗑️  Eliminando destino ID: ${destinoId}`);
      
      let deleteResult;
      if (ObjectId.isValid(destinoId)) {
        deleteResult = await destinosCollection.deleteOne({ _id: new ObjectId(destinoId) });
      } else {
        deleteResult = await destinosCollection.deleteOne({ id: destinoId.toString() });
      }

      if (deleteResult.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Destino no encontrado'
        });
      }

      console.log('✅ Destino eliminado');
      return res.json({
        success: true,
        message: 'Destino eliminado correctamente'
      });
    }

    else {
      return res.status(405).json({
        error: 'Método no permitido',
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
      });
    }

  } catch (error) {
    console.error('❌ Error en /api/destinos:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;