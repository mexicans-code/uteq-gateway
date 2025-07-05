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

  const { id } = req.query;
  
  // Debug: Log de la petición
  console.log('=== DEBUG INFO ===');
  console.log('Método:', req.method);
  console.log('Query params:', req.query);
  console.log('ID recibido:', id);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID es requerido' });
  }

  try {
    const db = await connectToDatabase();
    console.log('Conectado a DB:', dbName);

    // Verificar si el ID es válido
    if (!ObjectId.isValid(id)) {
      console.log('ID inválido:', id);
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido',
        debug: { id, valid: false }
      });
    }

    console.log('ID válido, buscando usuario...');
    
    // Buscar el usuario
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');

    if (!user) {
      // Debug adicional
      const totalUsers = await db.collection('users').countDocuments();
      const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
      
      console.log('Total usuarios:', totalUsers);
      console.log('Ejemplo de IDs existentes:', sampleUsers.map(u => u._id.toString()));
      
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado',
        debug: {
          searchedId: id,
          totalUsers,
          sampleIds: sampleUsers.map(u => u._id.toString())
        }
      });
    }

    // Remover campos sensibles
    const { contraseña, password, ...userSafe } = user;
    
    console.log('Usuario encontrado exitosamente');
    return res.status(200).json({ success: true, user: userSafe });

  } catch (error) {
    console.error('Error completo:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};