const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'NovaCode';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  if (!MONGO_URI) {
    throw new Error('MONGO_URI no está configurado en las variables de entorno');
  }

  console.log('🔄 Conectando a MongoDB...');
  console.log('📍 URI:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials
  console.log('📊 Base de datos:', DB_NAME);

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  console.log('✅ Conectado a MongoDB');

  const db = client.db(DB_NAME);

  await db.admin().ping();
  console.log('✅ Ping a base de datos exitoso');

  cachedClient = client;
  cachedDb = db;
  return db;
}

function getLastSixMonths() {
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: date.getFullYear(), month: date.getMonth() });
  }
  return months;
}

async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    console.log('🚀 Iniciando generación de reporte...');
    
    // Check environment variables
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no configurado');
    }

    const db = await connectToDatabase();
    console.log('✅ Conexión a base de datos establecida');

    // Check available collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Colecciones disponibles:', collections.map(c => c.name));

    // Initialize default values
    let totalUsuarios = 0;
    let usuariosActivosMes = 0;
    let totalEventos = 0;
    let totalEventosActivos = 0;
    let totalEventosFinalizados = 0;
    let totalNuevosUsuarios6Meses = 0;
    let nuevosUsuariosMapeados = [];
    let eventos = [];
    let profesoresPorDepartamento = [];
    let eventosPorUbicacion = [];

    // Check if users collection exists
    const hasUsersCollection = collections.some(c => c.name === 'users');
    console.log('👥 Colección users existe:', hasUsersCollection);

    if (hasUsersCollection) {
      try {
        // Get sample user document to check schema
        const sampleUser = await db.collection('users').findOne();
        console.log('👤 Usuario de muestra:', sampleUser ? Object.keys(sampleUser) : 'No hay usuarios');

        // Total usuarios - try different field names
        const usersWithTipo = await db.collection('users').countDocuments({ tipo: 'usuario' });
        const usersWithRole = await db.collection('users').countDocuments({ role: 'usuario' });
        const allUsers = await db.collection('users').countDocuments();
        
        console.log('📊 Usuarios con tipo "usuario":', usersWithTipo);
        console.log('📊 Usuarios con role "usuario":', usersWithRole);
        console.log('📊 Total usuarios:', allUsers);

        totalUsuarios = usersWithTipo > 0 ? usersWithTipo : (usersWithRole > 0 ? usersWithRole : allUsers);

        // Date calculations
        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Try different date field names for active users
        const activeUsersUltimoLogin = await db.collection('users').countDocuments({
          ultimoLogin: { $gte: inicioMes, $lt: finMes }
        });
        const activeUsersLastLogin = await db.collection('users').countDocuments({
          lastLogin: { $gte: inicioMes, $lt: finMes }
        });

        usuariosActivosMes = activeUsersUltimoLogin > 0 ? activeUsersUltimoLogin : activeUsersLastLogin;
        console.log('🎯 Usuarios activos mes:', usuariosActivosMes);

        // New users calculation
        const lastSixMonths = getLastSixMonths();
        const primerDiaMesMasAntiguo = new Date(lastSixMonths[0].year, lastSixMonths[0].month, 1);

        // Try different creation date field names
        const newUsersFechaCreacion = await db.collection('users').countDocuments({
          fechaCreacion: { $gte: primerDiaMesMasAntiguo }
        });
        const newUsersCreatedAt = await db.collection('users').countDocuments({
          createdAt: { $gte: primerDiaMesMasAntiguo }
        });

        totalNuevosUsuarios6Meses = newUsersFechaCreacion > 0 ? newUsersFechaCreacion : newUsersCreatedAt;
        console.log('📈 Nuevos usuarios 6 meses:', totalNuevosUsuarios6Meses);

        // Monthly new users - try both field names
        let nuevosUsuariosPorMes = [];
        try {
          nuevosUsuariosPorMes = await db.collection('users').aggregate([
            {
              $match: {
                fechaCreacion: { $gte: primerDiaMesMasAntiguo }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$fechaCreacion' },
                  month: { $month: '$fechaCreacion' }
                },
                cantidad: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                cantidad: 1
              }
            },
            {
              $sort: { year: 1, month: 1 }
            }
          ]).toArray();
        } catch (err) {
          console.log('⚠️ Error con fechaCreacion, probando createdAt...');
          try {
            nuevosUsuariosPorMes = await db.collection('users').aggregate([
              {
                $match: {
                  createdAt: { $gte: primerDiaMesMasAntiguo }
                }
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                  },
                  cantidad: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  year: '$_id.year',
                  month: '$_id.month',
                  cantidad: 1
                }
              },
              {
                $sort: { year: 1, month: 1 }
              }
            ]).toArray();
          } catch (err2) {
            console.log('⚠️ No se pudo obtener datos mensuales:', err2.message);
          }
        }

        // Map monthly data
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        nuevosUsuariosMapeados = lastSixMonths.map(({ year, month }) => {
          const found = nuevosUsuariosPorMes.find(nu => nu.year === year && nu.month === month + 1);
          return {
            mes: `${monthNames[month]} ${year}`,
            cantidad: found ? found.cantidad : 0,
          };
        });

      } catch (error) {
        console.error('❌ Error procesando usuarios:', error);
      }
    }

    // Check events collection
    const hasEventsCollection = collections.some(c => c.name === 'events');
    console.log('🎉 Colección events existe:', hasEventsCollection);

    if (hasEventsCollection) {
      try {
        // Get sample event to check schema
        const sampleEvent = await db.collection('events').findOne();
        console.log('🎊 Evento de muestra:', sampleEvent ? Object.keys(sampleEvent) : 'No hay eventos');

        totalEventos = await db.collection('events').countDocuments();
        totalEventosActivos = await db.collection('events').countDocuments({ estado: 'activo' });
        totalEventosFinalizados = await db.collection('events').countDocuments({ estado: 'finalizado' });

        console.log('🎯 Total eventos:', totalEventos);
        console.log('🎯 Eventos activos:', totalEventosActivos);
        console.log('🎯 Eventos finalizados:', totalEventosFinalizados);

        // Get events list
        eventos = await db.collection('events')
          .find({}, { projection: { titulo: 1, fecha: 1, _id: 0 } })
          .limit(10) // Limit to prevent large responses
          .toArray();

        // Events by location
        eventosPorUbicacion = await db.collection('events').aggregate([
          { $match: { estado: 'activo' } },
          { $group: { _id: '$ubicacion', cantidad: { $sum: 1 } } },
          { $project: { ubicacion: '$_id', cantidad: 1, _id: 0 } }
        ]).toArray();

      } catch (error) {
        console.error('❌ Error procesando eventos:', error);
      }
    }

    // Check personal collection (for professors)
    const hasPersonalCollection = collections.some(c => c.name === 'personal');
    console.log('👨‍🏫 Colección personal existe:', hasPersonalCollection);

    if (hasPersonalCollection) {
      try {
        const samplePersonal = await db.collection('personal').findOne();
        console.log('👤 Personal de muestra:', samplePersonal ? Object.keys(samplePersonal) : 'No hay personal');

        profesoresPorDepartamento = await db.collection('personal').aggregate([
          { $match: { estatus: 'activo', cargo: 'Profesor' } },
          { $group: { _id: '$departamento', cantidad: { $sum: 1 } } },
          { $project: { departamento: '$_id', cantidad: 1, _id: 0 } }
        ]).toArray();

      } catch (error) {
        console.error('❌ Error procesando personal:', error);
      }
    }

    console.log('✅ Reporte generado exitosamente');

    res.status(200).json({
      success: true,
      totalUsuarios,
      usuariosActivosMes,
      totalEventos,
      totalEventosActivos,
      totalEventosFinalizados,
      totalNuevosUsuarios6Meses,
      nuevosUsuarios: nuevosUsuariosMapeados,
      eventos,
      profesoresPorDepartamento,
      eventosPorUbicacion,
      // Debug info (remove in production)
      debug: {
        collectionsFound: collections.map(c => c.name),
        mongoUri: MONGO_URI ? 'Configurado' : 'No configurado',
        dbName: DB_NAME
      }
    });

  } catch (error) {
    console.error('❌ Error en handler:', error);
    
    // More detailed error response
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = handler;