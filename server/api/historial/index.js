// Archivo: /api/historial/index.js
// Maneja GET, POST, DELETE de todos los historiales

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = await connectToDatabase();
    const historialCollection = db.collection('historial');

    switch (req.method) {
      case 'GET':
        // Obtener todos los registros del historial
        const data = await historialCollection.find().sort({ _id: -1 }).toArray();
        return res.json({ success: true, data });

      case 'POST':
        // Crear nuevo registro en historial
        const nuevoRegistro = {
          nombre: req.body.nombre,
          dia: req.body.dia,
          hora: req.body.hora,
          tipo: req.body.tipo,
          userId: req.body.userId,
          createdAt: new Date()
        };
        
        const result = await historialCollection.insertOne(nuevoRegistro);
        return res.status(201).json({ 
          success: true, 
          message: 'Guardado en historial',
          id: result.insertedId 
        });

      case 'DELETE':
        // Para DELETE necesitamos el ID en query params o body
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ 
            success: false, 
            message: 'ID es requerido para eliminar' 
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ 
            success: false, 
            message: 'ID inválido' 
          });
        }

        const deleteResult = await historialCollection.deleteOne({ 
          _id: new ObjectId(id) 
        });

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Registro no encontrado' 
          });
        }

        return res.json({ 
          success: true, 
          message: 'Registro eliminado' 
        });

      default:
        return res.status(405).json({ 
          success: false, 
          message: 'Método no permitido' 
        });
    }

  } catch (error) {
    console.error('Error en historial:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};