const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'NovaCode';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;
  return db;
}

module.exports = async (req, res) => {
  console.log('🔥 usersByIdHandler ejecutándose para:', req.method, req.url);
  console.log('🔍 Handler usersById ejecutándose');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Params:', req.params);

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Extraer el ID del usuario de los parámetros o URL
    let userId = req.params?.id;
    
    // Si no está en params, intentar extraerlo de la URL
    if (!userId) {
      const urlParts = req.url.split('/');
      userId = urlParts[urlParts.length - 1];
      // Limpiar query parameters si existen
      if (userId.includes('?')) {
        userId = userId.split('?')[0];
      }
    }

    console.log('🆔 User ID extraído:', userId);

    if (!userId || userId === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario requerido' 
      });
    }

    // Verificar si es un ObjectId válido
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    // GET - Obtener usuario por ID
    if (req.method === 'GET') {
      console.log('📖 Obteniendo usuario:', userId);
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        user: {
          _id: user._id,
          nombre: user.nombre,
          usuario: user.usuario,
          origen: user.origen,
          tipo: user.tipo
        }
      });
    }

    // PUT - Actualizar usuario
    if (req.method === 'PUT') {
      console.log('✏️ Actualizando usuario:', userId);
      console.log('📝 Datos recibidos:', req.body);
      
      const { nombre, usuario, origen, tipo } = req.body;

      // Validaciones
      if (!nombre || !usuario || !origen) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nombre, usuario y origen son campos requeridos' 
        });
      }

      // Validar formato de datos
      const nombreTrimmed = nombre.trim();
      const usuarioTrimmed = usuario.trim().toLowerCase();
      const origenTrimmed = origen.trim();

      if (nombreTrimmed.length < 2 || nombreTrimmed.length > 100) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre debe tener entre 2 y 100 caracteres' 
        });
      }

      if (usuarioTrimmed.length < 3 || usuarioTrimmed.length > 50) {
        return res.status(400).json({ 
          success: false, 
          message: 'El usuario debe tener entre 3 y 50 caracteres' 
        });
      }

      // Verificar que el usuario no exista (excepto el usuario actual)
      const existingUser = await usersCollection.findOne({
        usuario: usuarioTrimmed,
        _id: { $ne: new ObjectId(userId) }
      });

      if (existingUser) {
        console.log('⚠️ Usuario ya existe:', usuarioTrimmed);
        return res.status(409).json({ 
          success: false, 
          message: 'El nombre de usuario ya está en uso' 
        });
      }

      // Verificar que el usuario a actualizar existe
      const userToUpdate = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!userToUpdate) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      // Preparar datos de actualización
      const updateData = {
        nombre: nombreTrimmed,
        usuario: usuarioTrimmed,
        origen: origenTrimmed,
        updatedAt: new Date()
      };

      // Solo actualizar el tipo si se proporciona y es válido
      const tiposValidos = ['administrador', 'admin', 'usuario', 'user', 'moderador', 'moderator', 'invitado', 'guest'];
      if (tipo && tiposValidos.includes(tipo.toLowerCase().trim())) {
        updateData.tipo = tipo.toLowerCase().trim();
      } else if (userToUpdate.tipo) {
        // Mantener el tipo existente si no se proporciona uno válido
        updateData.tipo = userToUpdate.tipo;
      }

      console.log('📊 Datos a actualizar:', updateData);

      // Actualizar usuario
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateData }
      );

      console.log('📈 Resultado de actualización:', result);

      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      // Obtener el usuario actualizado
      const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

      console.log('✅ Usuario actualizado exitosamente');

      return res.status(200).json({ 
        success: true, 
        message: 'Usuario actualizado exitosamente',
        user: {
          _id: updatedUser._id,
          nombre: updatedUser.nombre,
          usuario: updatedUser.usuario,
          origen: updatedUser.origen,
          tipo: updatedUser.tipo
        }
      });
    }

    // DELETE - Eliminar usuario (opcional)
    if (req.method === 'DELETE') {
      console.log('🗑️ Eliminando usuario:', userId);
      
      const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Usuario eliminado exitosamente' 
      });
    }

    // Método no permitido
    return res.status(405).json({ 
      success: false, 
      message: `Método ${req.method} no permitido` 
    });

  } catch (error) {
    console.error('❌ Error en el servicio de usuario individual:', error);
    
    // Errores específicos de MongoDB
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({ 
        success: false, 
        message: 'Error de base de datos' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};