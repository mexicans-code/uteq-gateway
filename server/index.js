const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🔍 Variables de entorno cargadas:');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Configurado' : 'NO CONFIGURADO');
console.log('DB_NAME:', process.env.DB_NAME);

const app = express();
app.use(cors());
app.use(express.json());

// Middleware global para loggear
app.use((req, res, next) => {
  console.log(`➡️ Petición recibida: ${req.method} ${req.originalUrl}`);
  next();
});

// Función adaptadora
function adaptHandler(handler) {
  return async (req, res, next) => {
    console.log(`🛠️ Ejecutando handler para ${req.method} ${req.originalUrl}`);
    try {
      await handler(req, res);
    } catch (error) {
      console.error('❌ Error en handler:', error.stack || error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}

// Cargar TODOS los handlers
console.log('🔄 Cargando TODOS los handlers...');
const destinosHandler = require('./api/destinos');
const eventosHandler = require('./api/events');
const mostVisitedHandler = require('./api/most-visited');
const registerHandler = require('./api/auth/register');
const loginHandler = require('./api/auth/login');
const usersHandler = require('./api/usersAll');
const usersByIdHandler = require('./api/usersById');
const historialHandler = require('./api/historial');
const reportHandler = require('./api/report');
const personalHandler = require('./api/personal');
console.log('✅ Todos los handlers cargados');

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'UTEQ Gateway API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba
app.get('/api/users/test/:id', (req, res) => {
  console.log('Ruta test llamada con id:', req.params.id);
  res.json({ message: 'Ruta test OK', id: req.params.id });
});

console.log('🔄 Configurando rutas...');

// IMPORTANTE: Rutas específicas ANTES que las generales
app.all('/api/users/:id', adaptHandler(usersByIdHandler));

// Rutas generales
app.use('/api/users', adaptHandler(usersHandler));
app.use('/api/destinos', adaptHandler(destinosHandler));
app.use('/api/events', adaptHandler(eventosHandler));
app.use('/api/most-visited', adaptHandler(mostVisitedHandler));
app.use('/api/historial', adaptHandler(historialHandler));
app.use('/api/report', adaptHandler(reportHandler));
app.use('/api/auth/register', adaptHandler(registerHandler));
app.use('/api/auth/login', adaptHandler(loginHandler));
app.use('/api/personal', adaptHandler(personalHandler));

console.log('✅ Rutas configuradas');

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});