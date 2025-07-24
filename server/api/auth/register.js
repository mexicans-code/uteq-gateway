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
    const { nombre, usuario, contraseña, origen, tipo } = req.body;

    // Mensaje de debug con datos recibidos, incluyendo tipo
    console.log('👋 Hola, estoy recibiendo los siguientes datos del front:');
    console.log({ nombre, usuario, contraseña, origen, tipo });

    // Validación de campos requeridos
    if (!nombre || !usuario || !contraseña || !origen || !tipo) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos',
        required: ['nombre', 'usuario', 'contraseña', 'origen', 'tipo']
      });
    }

    if (contraseña.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    if (usuario.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El usuario debe tener al menos 3 caracteres'
      });
    }

    console.log('🔍 Checking if user exists...');
    const existingUser = await db.collection('users').findOne({ usuario });

    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(409).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    console.log('💾 Creating user...');
    const result = await db.collection('users').insertOne({
      nombre,
      usuario,
      contraseña: hashedPassword,
      origen,
      tipo,         // Aquí sí se usa el tipo que envía el frontend
      estatus: 'activo',
      fechaCreacion: new Date(),
      ultimoLogin: null,
      intentosFallidos: 0
    });

    console.log('✅ User created successfully:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      userId: result.insertedId
    });

  } catch (error) {
    console.error('❌ Error al registrar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
