const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'NovaCode';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  if (!MONGO_URI) {
    throw new Error('MONGO_URI no está configurado');
  }

  console.log('🔄 Conectando a MongoDB...');
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

  // Genera array con objetos { year, month } para últimos 6 meses (incluyendo mes actual)
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
    const db = await connectToDatabase();

    // Total usuarios tipo "usuario"
    const totalUsuarios = await db.collection('users').countDocuments({ tipo: 'usuario' });

    // Fecha actual para filtrar usuarios activos en mes actual
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Usuarios que han iniciado sesión en el mes actual según ultimoLogin
    const usuariosActivosMes = await db.collection('users').countDocuments({
      tipo: 'usuario',
      ultimoLogin: { $gte: inicioMes, $lt: finMes }
    });

    // Últimos 6 meses (array con año y mes)
    const lastSixMonths = getLastSixMonths();

    // Fecha límite para los últimos 6 meses (primer día hace 5 meses)
    const primerDiaMesMasAntiguo = new Date(
      lastSixMonths[0].year,
      lastSixMonths[0].month,
      1
    );

    // Total nuevos usuarios últimos 6 meses
    const totalNuevosUsuarios6Meses = await db.collection('users').countDocuments({
      tipo: 'usuario',
      fechaCreacion: { $gte: primerDiaMesMasAntiguo }
    });

    // Nuevos usuarios por mes (últimos 6 meses) - agregación
    const nuevosUsuariosPorMes = await db.collection('users').aggregate([
      {
        $match: {
          tipo: 'usuario',
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

    // Para mostrar mes en formato "MMM YYYY" o "Agosto 2025", etc.
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Mapear resultados a array con todos los últimos 6 meses (incluso si no tienen datos)
    const nuevosUsuariosMapeados = lastSixMonths.map(({ year, month }) => {
      const found = nuevosUsuariosPorMes.find(nu => nu.year === year && nu.month === month + 1); // $month es 1-based
      return {
        mes: `${monthNames[month]} ${year}`,
        cantidad: found ? found.cantidad : 0,
      };
    });

    // Conteos de eventos
    const totalEventos = await db.collection('events').countDocuments();
    const totalEventosActivos = await db.collection('events').countDocuments({ estado: 'activo' });
    const totalEventosFinalizados = await db.collection('events').countDocuments({ estado: 'finalizado' });

    // Listado de eventos con título y fecha
    const eventos = await db.collection('events')
      .find({}, { projection: { titulo: 1, fecha: 1, _id: 0 } })
      .toArray();

    // Profesores por departamento (activo + cargo Profesor)
    const profesoresPorDepartamento = await db.collection('personal').aggregate([
      { $match: { estatus: 'activo', cargo: 'Profesor' } },
      { $group: { _id: '$departamento', cantidad: { $sum: 1 } } },
      { $project: { departamento: '$_id', cantidad: 1, _id: 0 } }
    ]).toArray();

    // Eventos activos por ubicación
    const eventosPorUbicacion = await db.collection('events').aggregate([
      { $match: { estado: 'activo' } },
      { $group: { _id: '$ubicacion', cantidad: { $sum: 1 } } },
      { $project: { ubicacion: '$_id', cantidad: 1, _id: 0 } }
    ]).toArray();

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
    });

  } catch (error) {
    console.error('❌ Error en handler:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

module.exports = handler;
