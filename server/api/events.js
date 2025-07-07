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

// Función para extraer ID de la URL
function extractIdFromUrl(url) {
  console.log('🔍 URL original:', url);
  
  // Remover query parameters
  const urlWithoutQuery = url.split('?')[0];
  console.log('🔍 URL sin query:', urlWithoutQuery);
  
  // Separar por '/' y filtrar partes vacías
  const parts = urlWithoutQuery.split('/').filter(part => part !== '');
  console.log('🔍 Partes de la URL:', parts);
  
  // Buscar el patrón /api/events/:id
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'events' && parts[i + 1]) {
      const id = parts[i + 1];
      console.log('🔍 ID encontrado (patrón api/events):', id);
      return { id, isStatusUpdate: false };
    }
  }
  
  // Si no se encuentra el patrón anterior, asumir que la URL es directa
  // Casos: /:id
  if (parts.length >= 1) {
    const id = parts[0];
    console.log('🔍 ID encontrado (patrón directo):', id);
    return { id, isStatusUpdate: false };
  }
  
  console.log('🔍 No se pudo extraer ID de la URL');
  return { id: null, isStatusUpdate: false };
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
        message: 'API eventos funcionando sin DB',
        timestamp: new Date().toISOString(),
        success: true
      });
    }

    // Ruta de diagnóstico
    if (req.query.diagnostico === 'true') {
      const db = await connectToDatabase();
      
      const collections = await db.listCollections().toArray();
      console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
      
      const eventsCollection = db.collection('events');
      const count = await eventsCollection.countDocuments();
      console.log(`🎉 Documentos en colección 'events': ${count}`);
      
      const samples = await eventsCollection.find().limit(3).toArray();
      console.log('📋 Documentos de muestra:', samples);
      
      return res.json({
        success: true,
        diagnostico: {
          conexion: 'OK',
          baseDatos: DB_NAME,
          colecciones: collections.map(c => c.name),
          eventsCount: count,
          muestras: samples
        }
      });
    }

    // Conectar a la base de datos
    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');

    // Extraer ID de la URL
    const { id: eventId } = extractIdFromUrl(req.url);
    
    console.log('🔍 ID extraído:', eventId);

    // ===========================================
    // GET REQUESTS
    // ===========================================
    if (req.method === 'GET') {
      if (eventId) {
        // GET /api/events/:id - Obtener evento específico
        console.log(`🔍 Buscando evento con ID: ${eventId}`);
        
        let evento;
        
        // Intentar buscar por ObjectId si es válido
        if (ObjectId.isValid(eventId)) {
          evento = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
          console.log('🔍 Búsqueda por ObjectId:', evento ? 'encontrado' : 'no encontrado');
        }
        
        // Si no se encontró, buscar por ID personalizado
        if (!evento) {
          evento = await eventsCollection.findOne({ id: eventId.toString() });
          console.log('🔍 Búsqueda por ID personalizado:', evento ? 'encontrado' : 'no encontrado');
        }

        if (!evento) {
          return res.status(404).json({
            success: false,
            message: 'Evento no encontrado',
            debug: {
              searchedId: eventId,
              isValidObjectId: ObjectId.isValid(eventId)
            }
          });
        }

        console.log('✅ Evento encontrado:', evento.titulo);
        return res.json({
          success: true,
          data: evento
        });
      } else {
        // GET /api/events - Obtener todos los eventos
        console.log('🔍 Obteniendo todos los eventos...');
        
        try {
          const events = await eventsCollection.find().sort({ id: 1 }).toArray();
          const count = events.length;
          
          console.log(`✅ Encontrados ${count} eventos`);
          
          return res.json({
            success: true,
            count,
            data: events
          });
        } catch (dbError) {
          console.log('⚠️ Error al obtener eventos:', dbError.message);
          return res.json({
            success: true,
            count: 0,
            data: [],
            message: 'La colección "events" no existe aún'
          });
        }
      }
    }

    // ===========================================
    // POST REQUESTS
    // ===========================================
    else if (req.method === 'POST') {
      console.log('📝 Creando nuevo evento:', req.body);
      
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos en el cuerpo de la petición'
        });
      }
      
      const { 
        id, 
        titulo, 
        descripcion, 
        fecha, 
        hora, 
        ubicacion, 
        organizador, 
        capacidad, 
        estado,
        imagen
      } = req.body;
      
      // Validaciones básicas
      if (!id || !titulo || !descripcion || !fecha || !hora || !ubicacion || !organizador || !imagen) {
        return res.status(400).json({
          success: false,
          message: 'Los campos id, titulo, descripcion, fecha, hora, ubicacion, organizador, imagen son requeridos'
        });
      }

      // Validar formato de fecha (YYYY-MM-DD)
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(fecha)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha debe tener el formato YYYY-MM-DD'
        });
      }

      // Validar formato de hora (HH:MM)
      const horaRegex = /^\d{2}:\d{2}$/;
      if (!horaRegex.test(hora)) {
        return res.status(400).json({
          success: false,
          message: 'La hora debe tener el formato HH:MM'
        });
      }

      // Verificar duplicados
      const existingEvent = await eventsCollection.findOne({ id: id.toString() });
      if (existingEvent) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un evento con este ID'
        });
      }

      const nuevoEvento = {
        id: id.toString(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha: fecha,
        hora: hora,
        ubicacion: ubicacion.trim(),
        organizador: organizador.trim(),
        capacidad: capacidad || null,
        estado: estado || 'activo',
        createdAt: new Date(),
        updatedAt: new Date(),
        imagen: imagen.trim()
      };

      const result = await eventsCollection.insertOne(nuevoEvento);
      console.log('✅ Evento creado con ID:', result.insertedId);
      
      return res.status(201).json({
        success: true,
        message: 'Evento creado correctamente',
        data: {
          _id: result.insertedId,
          ...nuevoEvento
        }
      });
    }

    // ===========================================
    // PUT REQUESTS
    // ===========================================
    else if (req.method === 'PUT') {
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento requerido para actualizar',
          debug: {
            url: req.url,
            extractedId: eventId
          }
        });
      }

      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos en el cuerpo de la petición'
        });
      }

      const { 
        titulo, 
        descripcion, 
        fecha, 
        hora, 
        ubicacion, 
        organizador, 
        capacidad, 
        estado,
        imagen 
      } = req.body;
      
      console.log(`📝 Actualizando evento ID: ${eventId}`);
      
      // Validaciones básicas
      if (!titulo || !descripcion || !fecha || !hora || !ubicacion || !organizador || !imagen) {
        return res.status(400).json({
          success: false,
          message: 'Los campos titulo, descripcion, fecha, hora, ubicacion, organizador, imagen son requeridos'
        });
      }

      // Validar formato de fecha (YYYY-MM-DD)
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(fecha)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha debe tener el formato YYYY-MM-DD'
        });
      }

      // Validar formato de hora (HH:MM)
      const horaRegex = /^\d{2}:\d{2}$/;
      if (!horaRegex.test(hora)) {
        return res.status(400).json({
          success: false,
          message: 'La hora debe tener el formato HH:MM'
        });
      }

      const updateData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha: fecha,
        hora: hora,
        ubicacion: ubicacion.trim(),
        organizador: organizador.trim(),
        capacidad: capacidad || null,
        estado: estado || 'activo',
        updatedAt: new Date(),
        imagen: imagen.trim()
      };

      let result;
      
      // Intentar actualizar por ObjectId si es válido
      if (ObjectId.isValid(eventId)) {
        result = await eventsCollection.updateOne(
          { _id: new ObjectId(eventId) },
          { $set: updateData }
        );
        console.log('🔄 Actualización por ObjectId:', result.matchedCount, 'coincidencias');
      }
      
      // Si no se actualizó, intentar por ID personalizado
      if (!result || result.matchedCount === 0) {
        result = await eventsCollection.updateOne(
          { id: eventId.toString() },
          { $set: updateData }
        );
        console.log('🔄 Actualización por ID personalizado:', result.matchedCount, 'coincidencias');
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado para actualizar',
          debug: {
            searchedId: eventId,
            isValidObjectId: ObjectId.isValid(eventId)
          }
        });
      }

      console.log('✅ Evento actualizado:', result.modifiedCount, 'registros modificados');
      
      // Obtener el evento actualizado
      let eventoActualizado;
      if (ObjectId.isValid(eventId)) {
        eventoActualizado = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
      } else {
        eventoActualizado = await eventsCollection.findOne({ id: eventId.toString() });
      }

      return res.json({
        success: true,
        message: 'Evento actualizado correctamente',
        data: eventoActualizado
      });
    }

    // ===========================================
    // DELETE REQUESTS
    // ===========================================
    else if (req.method === 'DELETE') {
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento requerido para eliminar',
          debug: {
            url: req.url,
            extractedId: eventId
          }
        });
      }

      console.log(`🗑️ Eliminando evento ID: ${eventId}`);
      
      let result;
      
      // Intentar eliminar por ObjectId si es válido
      if (ObjectId.isValid(eventId)) {
        result = await eventsCollection.deleteOne({ _id: new ObjectId(eventId) });
        console.log('🗑️ Eliminación por ObjectId:', result.deletedCount, 'registros eliminados');
      }
      
      // Si no se eliminó, intentar por ID personalizado
      if (!result || result.deletedCount === 0) {
        result = await eventsCollection.deleteOne({ id: eventId.toString() });
        console.log('🗑️ Eliminación por ID personalizado:', result.deletedCount, 'registros eliminados');
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado para eliminar',
          debug: {
            searchedId: eventId,
            isValidObjectId: ObjectId.isValid(eventId)
          }
        });
      }

      console.log('✅ Evento eliminado:', result.deletedCount, 'registros');
      
      return res.json({
        success: true,
        message: 'Evento eliminado correctamente'
      });
    }

    else {
      return res.status(405).json({
        success: false,
        message: 'Método no permitido',
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
      });
    }

  } catch (error) {
    console.error('❌ Error en handler:', error);
    console.error('❌ Stack trace:', error.stack);
    
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