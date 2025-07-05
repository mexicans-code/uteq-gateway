// Archivo: /api/historial/usuario/[userId].js
// Obtener historial por usuario específico

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId } = req.query;
  
  // Debug info
  console.log('=== DEBUG HISTORIAL USUARIO ===');
  console.log('Método:', req.method);
  console.log('userId recibido:', userId);
  console.log('Tipo de userId:', typeof userId);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'userId es requerido' 
    });
  }

  try {
    const db = await connectToDatabase();
    const historialCollection = db.collection('historial');

    // Verificar si el userId es un ObjectId válido
    let isValidObjectId = ObjectId.isValid(userId);
    console.log('¿Es ObjectId válido?:', isValidObjectId);

    // Debug: Ver algunos documentos de ejemplo
    const sampleDocs = await historialCollection.find({}).limit(3).toArray();
    console.log('Documentos de ejemplo:', sampleDocs.map(doc => ({
      _id: doc._id,
      userId: doc.userId,
      tipoUserId: typeof doc.userId
    })));

    // Intentar diferentes tipos de búsqueda
    let result = [];

    if (isValidObjectId) {
      // Buscar como ObjectId
      const resultObjectId = await historialCollection
        .find({ userId: new ObjectId(userId) })
        .sort({ _id: -1 })
        .toArray();
      
      console.log('Resultados con ObjectId:', resultObjectId.length);
      
      if (resultObjectId.length > 0) {
        result = resultObjectId;
      } else {
        // Si no encuentra con ObjectId, intentar como string
        const resultString = await historialCollection
          .find({ userId: userId })
          .sort({ _id: -1 })
          .toArray();
        
        console.log('Resultados con String:', resultString.length);
        result = resultString;
      }
    } else {
      // Buscar como string
      result = await historialCollection
        .find({ userId: userId })
        .sort({ _id: -1 })
        .toArray();
      
      console.log('Resultados (userId como string):', result.length);
    }

    // Debug adicional si no encuentra nada
    if (result.length === 0) {
      const allUserIds = await historialCollection.distinct('userId');
      console.log('Todos los userIds existentes:', allUserIds);
      
      return res.json({
        success: true,
        data: [],
        debug: {
          searchedUserId: userId,
          searchedAsObjectId: isValidObjectId,
          totalDocuments: await historialCollection.countDocuments(),
          existingUserIds: allUserIds.map(id => ({
            value: id,
            type: typeof id,
            isObjectId: ObjectId.isValid(id)
          }))
        }
      });
    }

    console.log(`Encontrados ${result.length} registros para usuario ${userId}`);
    console.log('=== DEBUG FIN ===');

    return res.json({
      success: true,
      data: result,
      count: result.length
    });

  } catch (error) {
    console.error('Error al obtener historial del usuario:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};