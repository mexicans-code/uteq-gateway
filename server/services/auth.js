require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3005;

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'Mapa-UTEQ';

let db;

app.use(cors());
app.use(express.json());

const checkDbConnection = (req, res, next) => {
    if (!db) {
        return res.status(500).json({ message: 'Database connection not established' });
    }
    next();
};
const connectToDatabase = async () => {
    try {
        if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
            throw new Error('MONGO_URI is missing or invalid in .env');
        }

        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log(`✅ Conectado a MongoDB Atlas (${DB_NAME})`);
    } catch (err) {
        console.error('❌ Error al conectar a MongoDB:', err.message);
        process.exit(1);
    }
};

app.post('/api/register', checkDbConnection, async (req, res) => {
  try {
    const { nombre, usuario, contraseña, origen } = req.body;
    
    // Validación más robusta
    if (!nombre || !usuario || !contraseña || !origen) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son requeridos' 
      });
    }

    const existingUser = await db.collection('users').findOne({ usuario });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'El usuario ya existe' 
      });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    await db.collection('users').insertOne({
      nombre,
      usuario,
      contraseña: hashedPassword,
      origen,
      estatus: 'activo',
      fechaCreacion: new Date()
    });

    res.status(201).json({ 
      success: true, 
      message: 'Usuario registrado correctamente' 
    });
  } catch (error) {
    console.error('Error al registrar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});
app.post('/api/login', checkDbConnection, async (req, res) => {
    try {
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
  
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            ultimoLogin: new Date()
          },
          $unset: { 
            intentosFallidos: "" 
          }
        }
      );
  
      const { contraseña: _, ...userWithoutPassword } = user;
      
      res.status(200).json({ 
        success: true, 
        message: 'Login exitoso',
        user: {
          id: user._id,
          nombre: user.nombre,
          usuario: user.usuario,
          estatus: user.estatus
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
  });


  
connectToDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Auth Service running on port ${PORT}`);
    });
});
