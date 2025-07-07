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
    console.log(`📊 ${req.method} ${req.url}`);
    
    // Ruta de prueba simple
    if (req.query.test === 'simple') {
      return res.status(200).json({
        message: 'API destinos funcionando sin DB',
        timestamp: new Date().toISOString(),
        success: true
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

    // Conectar a la base de datos para operaciones CRUD
    const db = await connectToDatabase();
    const destinosCollection = db.collection('destinos');

    // Obtener ID específico de la URL usando req.query y pathinfo
    let destinoId = null;
    
    // Intentar obtener ID de diferentes maneras
    if (req.query.id) {
      destinoId = req.query.id;
    } else {
      // Parsear URL para obtener ID - más robusto
      const urlWithoutQuery = req.url.split('?')[0];
      const urlParts = urlWithoutQuery.split('/').filter(part => part !== '');
      
      console.log('🔍 URL parts:', urlParts);
      
      // Buscar 'destinos' en la URL y tomar el siguiente elemento
      const destinosIndex = urlParts.findIndex(part => part === 'destinos');
      if (destinosIndex !== -1 && urlParts[destinosIndex + 1]) {
        destinoId = urlParts[destinosIndex + 1];
      }
      
      // También intentar buscar por 'api/destinos'
      if (!destinoId) {
        const apiIndex = urlParts.findIndex(part => part === 'api');
        if (apiIndex !== -1 && urlParts[apiIndex + 1] === 'destinos' && urlParts[apiIndex + 2]) {
          destinoId = urlParts[apiIndex + 2];
        }
      }
      
      // Si no encontró por las rutas normales, y solo hay un elemento en la URL,
      // asumir que es el ID (para APIs serverless como Vercel)
      if (!destinoId && urlParts.length === 1 && urlParts[0]) {
        destinoId = urlParts[0];
        console.log('🔍 Usando URL simple como ID:', destinoId);
      }
    }

    console.log('🔍 URL completa:', req.url);
    console.log('🔍 ID extraído:', destinoId);

    if (req.method === 'GET') {
      if (destinoId) {
        // GET /api/destinos/:id - Obtener destino específico
        console.log(`🔍 Buscando destino con ID: ${destinoId}`);
        
        let destino;
        
        // Intentar buscar por ObjectId si es válido
        if (ObjectId.isValid(destinoId)) {
          destino = await destinosCollection.findOne({ _id: new ObjectId(destinoId) });
        }
        
        // Si no se encontró, buscar por ID personalizado
        if (!destino) {
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
        console.log('🔍 Obteniendo todos los destinos...');
        
        try {
          const destinos = await destinosCollection.find().sort({ id: 1 }).toArray();
          const count = destinos.length;
          
          console.log(`✅ Encontrados ${count} destinos`);
          
          return res.json({
            success: true,
            count,
            data: destinos
          });
        } catch (dbError) {
          console.log('⚠️ Error al obtener destinos, devolviendo array vacío:', dbError.message);
          return res.json({
            success: true,
            count: 0,
            data: [],
            message: 'La colección "destinos" no existe aún'
          });
        }
      }
    }

    else if (req.method === 'POST') {
      // POST /api/destinos - Crear nuevo destino
      console.log('📝 Creando nuevo destino:', req.body);
      console.log('📝 Headers:', req.headers);
      console.log('📝 Content-Type:', req.headers['content-type']);
      
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos en el cuerpo de la petición',
          debug: {
            body: req.body,
            headers: req.headers,
            method: req.method
          }
        });
      }
      
      const { id, nombre, posicion } = req.body;
      
      console.log('📝 Datos extraídos:', { id, nombre, posicion });
      
      // Validaciones más detalladas
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El campo "id" es requerido',
          debug: { receivedData: req.body, missingField: 'id' }
        });
      }
      
      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: 'El campo "nombre" es requerido',
          debug: { receivedData: req.body, missingField: 'nombre' }
        });
      }
      
      if (!posicion) {
        return res.status(400).json({
          success: false,
          message: 'El campo "posicion" es requerido',
          debug: { receivedData: req.body, missingField: 'posicion' }
        });
      }
      
      if (typeof posicion.latitude === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'El campo "posicion.latitude" es requerido',
          debug: { receivedData: req.body, posicion: posicion, missingField: 'posicion.latitude' }
        });
      }
      
      if (typeof posicion.longitude === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'El campo "posicion.longitude" es requerido',
          debug: { receivedData: req.body, posicion: posicion, missingField: 'posicion.longitude' }
        });
      }

      // Verificar que el ID no exista
      const existingDestino = await destinosCollection.findOne({ id: id.toString() });
      if (existingDestino) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un destino con este ID',
          debug: { existingDestino: existingDestino, providedId: id }
        });
      }

      // Validar coordenadas
      const lat = parseFloat(posicion.latitude);
      const lng = parseFloat(posicion.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          message: 'Las coordenadas deben ser números válidos',
          debug: { 
            latitude: posicion.latitude, 
            longitude: posicion.longitude,
            parsedLat: lat,
            parsedLng: lng,
            isNaNLat: isNaN(lat),
            isNaNLng: isNaN(lng)
          }
        });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Coordenadas fuera de rango válido',
          debug: { 
            latitude: lat, 
            longitude: lng,
            validRange: 'lat: -90 a 90, lng: -180 a 180'
          }
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
          message: 'ID de destino requerido. URL debe ser /api/destinos/:id o incluir ?id=:id',
          debug: {
            url: req.url,
            method: req.method,
            idEncontrado: destinoId
          }
        });
      }

      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos en el cuerpo de la petición'
        });
      }

      const { nombre, posicion } = req.body;
      
      console.log(`📝 Actualizando destino ID: ${destinoId}`, req.body);
      
      // Validaciones
      if (!nombre || !posicion || typeof posicion.latitude === 'undefined' || typeof posicion.longitude === 'undefined') {
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

      let result;
      
      // Intentar actualizar por ObjectId si es válido
      if (ObjectId.isValid(destinoId)) {
        result = await destinosCollection.updateOne(
          { _id: new ObjectId(destinoId) },
          { $set: updateData }
        );
      }
      
      // Si no se actualizó, intentar por ID personalizado
      if (!result || result.matchedCount === 0) {
        result = await destinosCollection.updateOne(
          { id: destinoId.toString() },
          { $set: updateData }
        );
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Destino no encontrado'
        });
      }

      console.log('✅ Destino actualizado:', result.modifiedCount);
      
      // Obtener el destino actualizado
      let destinoActualizado;
      if (ObjectId.isValid(destinoId)) {
        destinoActualizado = await destinosCollection.findOne({ _id: new ObjectId(destinoId) });
      } else {
        destinoActualizado = await destinosCollection.findOne({ id: destinoId.toString() });
      }

      return res.json({
        success: true,
        message: 'Destino actualizado correctamente',
        data: destinoActualizado
      });
    }

    else if (req.method === 'DELETE') {
      // DELETE /api/destinos/:id - Eliminar destino
      if (!destinoId) {
        return res.status(400).json({
          success: false,
          message: 'ID de destino requerido. URL debe ser /api/destinos/:id o incluir ?id=:id',
          debug: {
            url: req.url,
            method: req.method,
            idEncontrado: destinoId
          }
        });
      }

      console.log(`🗑️ Eliminando destino ID: ${destinoId}`);
      
      let result;
      
      // Intentar eliminar por ObjectId si es válido
      if (ObjectId.isValid(destinoId)) {
        result = await destinosCollection.deleteOne({ _id: new ObjectId(destinoId) });
      }
      
      // Si no se eliminó, intentar por ID personalizado
      if (!result || result.deletedCount === 0) {
        result = await destinosCollection.deleteOne({ id: destinoId.toString() });
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Destino no encontrado'
        });
      }

      console.log('✅ Destino eliminado:', result.deletedCount);
      
      return res.json({
        success: true,
        message: 'Destino eliminado correctamente'
      });
    }

    else {
      // Método no permitido
      return res.status(405).json({
        success: false,
        message: 'Método no permitido'
      });
    }

  } catch (error) {
    console.error('❌ Error en handler:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Request info:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      debug: {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Manejar cierre de conexión
process.on('SIGINT', async () => {
  console.log('🔄 Cerrando conexión a MongoDB...');
  if (cachedClient) {
    await cachedClient.close();
    console.log('✅ Conexión cerrada');
  }
  process.exit(0);
});

module.exports = handler;