// Archivo: /api/auth/login.js
// Login de usuarios

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'Mapa-UTEQ';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Método no permitido' 
    });
  }

  try {
    const db = await connectToDatabase();
    console.log('🔐 Processing login request');
    
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos' 
      });
    }

    console.log('🔍 Searching for user:', usuario);
    
    const user = await db.collection('users').findOne({ usuario });
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    console.log('🔐 Verifying password...');
    
    const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      
      // Incrementar intentos fallidos
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $inc: { intentosFallidos: 1 },
          $set: { ultimoIntentoFallido: new Date() }
        }
      );
      
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    if (user.estatus !== 'activo') {
      console.log('❌ User is not active');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario desactivado' 
      });
    }

    console.log('✅ Login successful for user:', usuario);

    // Actualizar último login y limpiar intentos fallidos
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          ultimoLogin: new Date()
        },
        $unset: { 
          intentosFallidos: "",
          ultimoIntentoFallido: ""
        }
      }
    );

    // Remover contraseña de la respuesta
    const { contraseña: _, ...userWithoutPassword } = user;
    
    res.status(200).json({ 
      success: true, 
      message: 'Login exitoso',
      user: {
        id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        origen: user.origen,
        estatus: user.estatus,
        fechaCreacion: user.fechaCreacion,
        ultimoLogin: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error al hacer login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};