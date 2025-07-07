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

// Función simplificada para extraer ID de la URL
function extractIdFromUrl(url) {
    console.log('🔍 URL original:', url);
    
    // Remover query parameters
    const urlWithoutQuery = url.split('?')[0];
    console.log('🔍 URL sin query:', urlWithoutQuery);
    
    // Separar por '/' y filtrar partes vacías
    const parts = urlWithoutQuery.split('/').filter(part => part !== '');
    console.log('🔍 Partes de la URL:', parts);
    
    // Buscar el patrón /api/personal/:id (para URLs completas)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'personal' && parts[i + 1] && parts[i + 1] !== 'estatus') {
        const id = parts[i + 1];
        const isStatusUpdate = parts[i + 2] === 'estatus';
        console.log('🔍 ID encontrado (patrón api/personal):', id);
        console.log('🔍 Es actualización de estatus:', isStatusUpdate);
        return { id, isStatusUpdate };
      }
    }
    
    // Si no se encuentra el patrón anterior, asumir que la URL es directa
    // Casos: /:id, /:id/estatus
    if (parts.length >= 1) {
      const id = parts[0];
      const isStatusUpdate = parts[1] === 'estatus';
      
      console.log('🔍 ID encontrado (patrón directo):', id);
      console.log('🔍 Es actualización de estatus:', isStatusUpdate);
      return { id, isStatusUpdate };
    }
    
    console.log('🔍 No se pudo extraer ID de la URL');
    return { id: null, isStatusUpdate: false };
  }

async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`📊 ${req.method} ${req.url}`);
    
    // Ruta de prueba simple
    if (req.query.test === 'simple') {
      return res.status(200).json({
        message: 'API personal funcionando sin DB',
        timestamp: new Date().toISOString(),
        success: true
      });
    }

    // Ruta de diagnóstico
    if (req.query.diagnostico === 'true') {
      const db = await connectToDatabase();
      
      const collections = await db.listCollections().toArray();
      console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
      
      const personalCollection = db.collection('personal');
      const count = await personalCollection.countDocuments();
      console.log(`👥 Documentos en colección 'personal': ${count}`);
      
      const samples = await personalCollection.find().limit(3).toArray();
      console.log('📋 Documentos de muestra:', samples);
      
      return res.json({
        success: true,
        diagnostico: {
          conexion: 'OK',
          baseDatos: DB_NAME,
          colecciones: collections.map(c => c.name),
          personalCount: count,
          muestras: samples
        }
      });
    }

    // Conectar a la base de datos
    const db = await connectToDatabase();
    const personalCollection = db.collection('personal');

    // Extraer ID de la URL
    const { id: personalId, isStatusUpdate } = extractIdFromUrl(req.url);
    
    console.log('🔍 ID extraído:', personalId);
    console.log('🔍 Es actualización de estatus:', isStatusUpdate);

    // ===========================================
    // GET REQUESTS
    // ===========================================
    if (req.method === 'GET') {
      if (personalId) {
        // GET /api/personal/:id - Obtener personal específico
        console.log(`🔍 Buscando personal con ID: ${personalId}`);
        
        let personal;
        
        // Intentar buscar por ObjectId si es válido
        if (ObjectId.isValid(personalId)) {
          personal = await personalCollection.findOne({ _id: new ObjectId(personalId) });
          console.log('🔍 Búsqueda por ObjectId:', personal ? 'encontrado' : 'no encontrado');
        }
        
        // Si no se encontró, buscar por número de empleado
        if (!personal) {
          personal = await personalCollection.findOne({ numeroEmpleado: personalId.toString() });
          console.log('🔍 Búsqueda por numeroEmpleado:', personal ? 'encontrado' : 'no encontrado');
        }

        if (!personal) {
          return res.status(404).json({
            success: false,
            message: 'Personal no encontrado',
            debug: {
              searchedId: personalId,
              isValidObjectId: ObjectId.isValid(personalId)
            }
          });
        }

        console.log('✅ Personal encontrado:', personal.nombre);
        return res.json({
          success: true,
          data: personal
        });
      } else {
        // GET /api/personal - Obtener todo el personal
        console.log('🔍 Obteniendo todo el personal...');
        
        try {
          const personal = await personalCollection.find().sort({ fechaIngreso: -1 }).toArray();
          const count = personal.length;
          
          console.log(`✅ Encontrados ${count} registros de personal`);
          
          return res.json({
            success: true,
            count,
            data: personal
          });
        } catch (dbError) {
          console.log('⚠️ Error al obtener personal:', dbError.message);
          return res.json({
            success: true,
            count: 0,
            data: [],
            message: 'La colección "personal" no existe aún'
          });
        }
      }
    }

    // ===========================================
    // POST REQUESTS
    // ===========================================
    else if (req.method === 'POST') {
      console.log('📝 Creando nuevo personal:', req.body);
      
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: 'Datos requeridos en el cuerpo de la petición'
        });
      }
      
      const { 
        numeroEmpleado, 
        nombre, 
        apellidoPaterno, 
        apellidoMaterno, 
        email, 
        telefono, 
        departamento, 
        cargo, 
        fechaIngreso, 
        estatus 
      } = req.body;
      
      // Validaciones básicas
      const requiredFields = { numeroEmpleado, nombre, apellidoPaterno, email, departamento, cargo };
      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value || !value.toString().trim()) {
          return res.status(400).json({
            success: false,
            message: `El campo '${field}' es requerido`
          });
        }
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        });
      }

      // Verificar duplicados
      const existingPersonal = await personalCollection.findOne({ numeroEmpleado: numeroEmpleado.toString() });
      if (existingPersonal) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un empleado con este número'
        });
      }

      const existingEmail = await personalCollection.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un empleado con este email'
        });
      }

      const nuevoPersonal = {
        numeroEmpleado: numeroEmpleado.toString(),
        nombre: nombre.trim(),
        apellidoPaterno: apellidoPaterno.trim(),
        apellidoMaterno: apellidoMaterno ? apellidoMaterno.trim() : '',
        email: email.toLowerCase().trim(),
        telefono: telefono ? telefono.trim() : '',
        departamento: departamento.trim(),
        cargo: cargo.trim(),
        fechaIngreso: fechaIngreso || new Date().toISOString().split('T')[0],
        estatus: estatus || 'activo',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await personalCollection.insertOne(nuevoPersonal);
      console.log('✅ Personal creado con ID:', result.insertedId);
      
      return res.status(201).json({
        success: true,
        message: 'Personal creado correctamente',
        data: {
          _id: result.insertedId,
          ...nuevoPersonal
        }
      });
    }

    // ===========================================
    // PUT REQUESTS
    // ===========================================
    else if (req.method === 'PUT') {
      if (!personalId) {
        return res.status(400).json({
          success: false,
          message: 'ID de personal requerido para actualizar',
          debug: {
            url: req.url,
            extractedId: personalId
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
        numeroEmpleado, 
        nombre, 
        apellidoPaterno, 
        apellidoMaterno, 
        email, 
        telefono, 
        departamento, 
        cargo, 
        fechaIngreso, 
        estatus 
      } = req.body;
      
      console.log(`📝 Actualizando personal ID: ${personalId}`);
      
      // Validaciones básicas
      const requiredFields = { numeroEmpleado, nombre, apellidoPaterno, email, departamento, cargo };
      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value || !value.toString().trim()) {
          return res.status(400).json({
            success: false,
            message: `El campo '${field}' es requerido`
          });
        }
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        });
      }

      // Construir filtro para buscar el registro actual
      let currentRecordFilter = {};
      if (ObjectId.isValid(personalId)) {
        currentRecordFilter = { _id: new ObjectId(personalId) };
      } else {
        currentRecordFilter = { numeroEmpleado: personalId.toString() };
      }

      // Verificar duplicados excluyendo el registro actual
      const existingPersonal = await personalCollection.findOne({ 
        numeroEmpleado: numeroEmpleado.toString(),
        ...currentRecordFilter
      });
      
      if (existingPersonal) {
        // Si encontró un registro, verificar que sea el mismo que estamos actualizando
        const isCurrentRecord = ObjectId.isValid(personalId) 
          ? existingPersonal._id.toString() === personalId
          : existingPersonal.numeroEmpleado === personalId.toString();
          
        if (!isCurrentRecord) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro empleado con este número'
          });
        }
      }

      const existingEmail = await personalCollection.findOne({ 
        email: email.toLowerCase(),
        ...currentRecordFilter
      });
      
      if (existingEmail) {
        const isCurrentRecord = ObjectId.isValid(personalId) 
          ? existingEmail._id.toString() === personalId
          : existingEmail.numeroEmpleado === personalId.toString();
          
        if (!isCurrentRecord) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro empleado con este email'
          });
        }
      }

      const updateData = {
        numeroEmpleado: numeroEmpleado.toString(),
        nombre: nombre.trim(),
        apellidoPaterno: apellidoPaterno.trim(),
        apellidoMaterno: apellidoMaterno ? apellidoMaterno.trim() : '',
        email: email.toLowerCase().trim(),
        telefono: telefono ? telefono.trim() : '',
        departamento: departamento.trim(),
        cargo: cargo.trim(),
        fechaIngreso: fechaIngreso || new Date().toISOString().split('T')[0],
        estatus: estatus || 'activo',
        updatedAt: new Date()
      };

      let result;
      
      // Intentar actualizar por ObjectId si es válido
      if (ObjectId.isValid(personalId)) {
        result = await personalCollection.updateOne(
          { _id: new ObjectId(personalId) },
          { $set: updateData }
        );
        console.log('🔄 Actualización por ObjectId:', result.matchedCount, 'coincidencias');
      }
      
      // Si no se actualizó, intentar por número de empleado
      if (!result || result.matchedCount === 0) {
        result = await personalCollection.updateOne(
          { numeroEmpleado: personalId.toString() },
          { $set: updateData }
        );
        console.log('🔄 Actualización por numeroEmpleado:', result.matchedCount, 'coincidencias');
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Personal no encontrado para actualizar',
          debug: {
            searchedId: personalId,
            isValidObjectId: ObjectId.isValid(personalId)
          }
        });
      }

      console.log('✅ Personal actualizado:', result.modifiedCount, 'registros modificados');
      
      // Obtener el personal actualizado
      let personalActualizado;
      if (ObjectId.isValid(personalId)) {
        personalActualizado = await personalCollection.findOne({ _id: new ObjectId(personalId) });
      } else {
        personalActualizado = await personalCollection.findOne({ numeroEmpleado: personalId.toString() });
      }

      return res.json({
        success: true,
        message: 'Personal actualizado correctamente',
        data: personalActualizado
      });
    }

    // ===========================================
    // PATCH REQUESTS (para estatus)
    // ===========================================
    else if (req.method === 'PATCH') {
      if (!personalId || !isStatusUpdate) {
        return res.status(400).json({
          success: false,
          message: 'ID de personal y endpoint de estatus requeridos (/api/personal/:id/estatus)',
          debug: {
            url: req.url,
            personalId,
            isStatusUpdate
          }
        });
      }

      if (!req.body || !req.body.estatus) {
        return res.status(400).json({
          success: false,
          message: 'Campo "estatus" requerido en el cuerpo de la petición'
        });
      }

      const { estatus } = req.body;
      
      console.log(`📝 Actualizando estatus de personal ID: ${personalId} a: ${estatus}`);
      
      // Validar estatus
      if (!['activo', 'inactivo'].includes(estatus)) {
        return res.status(400).json({
          success: false,
          message: 'El estatus debe ser "activo" o "inactivo"'
        });
      }

      const updateData = {
        estatus: estatus,
        updatedAt: new Date()
      };

      let result;
      
      // Intentar actualizar por ObjectId si es válido
      if (ObjectId.isValid(personalId)) {
        result = await personalCollection.updateOne(
          { _id: new ObjectId(personalId) },
          { $set: updateData }
        );
        console.log('🔄 Actualización estatus por ObjectId:', result.matchedCount, 'coincidencias');
      }
      
      // Si no se actualizó, intentar por número de empleado
      if (!result || result.matchedCount === 0) {
        result = await personalCollection.updateOne(
          { numeroEmpleado: personalId.toString() },
          { $set: updateData }
        );
        console.log('🔄 Actualización estatus por numeroEmpleado:', result.matchedCount, 'coincidencias');
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Personal no encontrado para actualizar estatus',
          debug: {
            searchedId: personalId,
            isValidObjectId: ObjectId.isValid(personalId)
          }
        });
      }

      console.log('✅ Estatus actualizado:', result.modifiedCount, 'registros modificados');
      
      // Obtener el personal actualizado
      let personalActualizado;
      if (ObjectId.isValid(personalId)) {
        personalActualizado = await personalCollection.findOne({ _id: new ObjectId(personalId) });
      } else {
        personalActualizado = await personalCollection.findOne({ numeroEmpleado: personalId.toString() });
      }

      return res.json({
        success: true,
        message: 'Estatus actualizado correctamente',
        data: personalActualizado
      });
    }

    // ===========================================
    // DELETE REQUESTS
    // ===========================================
    else if (req.method === 'DELETE') {
      if (!personalId) {
        return res.status(400).json({
          success: false,
          message: 'ID de personal requerido para eliminar',
          debug: {
            url: req.url,
            extractedId: personalId
          }
        });
      }

      console.log(`🗑️ Eliminando personal ID: ${personalId}`);
      
      let result;
      
      // Intentar eliminar por ObjectId si es válido
      if (ObjectId.isValid(personalId)) {
        result = await personalCollection.deleteOne({ _id: new ObjectId(personalId) });
        console.log('🗑️ Eliminación por ObjectId:', result.deletedCount, 'registros eliminados');
      }
      
      // Si no se eliminó, intentar por número de empleado
      if (!result || result.deletedCount === 0) {
        result = await personalCollection.deleteOne({ numeroEmpleado: personalId.toString() });
        console.log('🗑️ Eliminación por numeroEmpleado:', result.deletedCount, 'registros eliminados');
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Personal no encontrado para eliminar',
          debug: {
            searchedId: personalId,
            isValidObjectId: ObjectId.isValid(personalId)
          }
        });
      }

      console.log('✅ Personal eliminado:', result.deletedCount, 'registros');
      
      return res.json({
        success: true,
        message: 'Personal eliminado correctamente'
      });
    }

    else {
      return res.status(405).json({
        success: false,
        message: 'Método no permitido',
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
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