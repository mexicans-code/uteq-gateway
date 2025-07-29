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

console.log('🔄 Configurando rutas paso a paso...');

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'UTEQ Gateway API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Ruta raíz configurada');

// Ruta de prueba específica
app.get('/api/users/test/:id', (req, res) => {
  console.log('🧪 Ruta test llamada con id:', req.params.id);
  res.json({ message: 'Ruta test OK', id: req.params.id });
});
console.log('✅ Ruta test configurada');

// PASO 1: Solo auth
console.log('\n🔄 PASO 1: Configurando rutas de autenticación...');
try {
  const registerHandler = require('./api/auth/register');
  const loginHandler = require('./api/auth/login');
  
  app.post('/api/auth/register', adaptHandler(registerHandler));
  app.post('/api/auth/login', adaptHandler(loginHandler));
  
  console.log('✅ PASO 1 completado - Auth configurado');
} catch (error) {
  console.error('❌ Error en PASO 1:', error.message);
}

// PASO 2: Users por ID (ESPECÍFICAS PRIMERO)
console.log('\n🔄 PASO 2: Configurando rutas específicas de usuarios...');
try {
  const usersByIdHandler = require('./api/usersById');
  
  app.get('/api/users/:id', adaptHandler(usersByIdHandler));
  app.put('/api/users/:id', adaptHandler(usersByIdHandler));
  app.delete('/api/users/:id', adaptHandler(usersByIdHandler));
  
  console.log('✅ PASO 2 completado - Users by ID configurado');
} catch (error) {
  console.error('❌ Error en PASO 2:', error.message);
}

// PASO 3: Users general
console.log('\n🔄 PASO 3: Configurando ruta general de usuarios...');
try {
  const usersHandler = require('./api/usersAll');
  
  app.use('/api/users', adaptHandler(usersHandler));
  
  console.log('✅ PASO 3 completado - Users general configurado');
} catch (error) {
  console.error('❌ Error en PASO 3:', error.message);
}

// PASO 4: Una ruta adicional por vez
console.log('\n🔄 PASO 4: Configurando una ruta adicional...');
try {
  const destinosHandler = require('./api/destinos');
  
  app.use('/api/destinos', adaptHandler(destinosHandler));
  
  console.log('✅ PASO 4 completado - Destinos configurado');
} catch (error) {
  console.error('❌ Error en PASO 4:', error.message);
}

// PASO 5: Otra ruta adicional
console.log('\n🔄 PASO 5: Configurando otra ruta adicional...');
try {
  const eventosHandler = require('./api/events');
  
  app.use('/api/events', adaptHandler(eventosHandler));
  
  console.log('✅ PASO 5 completado - Events configurado');
} catch (error) {
  console.error('❌ Error en PASO 5:', error.message);
}

// COMENTAR/DESCOMENTAR ESTOS PASOS UNO A LA VEZ PARA IDENTIFICAR EL PROBLEMA

/*
// PASO 6: Most visited
console.log('\n🔄 PASO 6: Configurando most-visited...');
try {
  const mostVisitedHandler = require('./api/most-visited');
  app.use('/api/most-visited', adaptHandler(mostVisitedHandler));
  console.log('✅ PASO 6 completado - Most visited configurado');
} catch (error) {
  console.error('❌ Error en PASO 6:', error.message);
}

// PASO 7: Historial
console.log('\n🔄 PASO 7: Configurando historial...');
try {
  const historialHandler = require('./api/historial');
  app.use('/api/historial', adaptHandler(historialHandler));
  console.log('✅ PASO 7 completado - Historial configurado');
} catch (error) {
  console.error('❌ Error en PASO 7:', error.message);
}

// PASO 8: Report
console.log('\n🔄 PASO 8: Configurando report...');
try {
  const reportHandler = require('./api/report');
  app.use('/api/report', adaptHandler(reportHandler));
  console.log('✅ PASO 8 completado - Report configurado');
} catch (error) {
  console.error('❌ Error en PASO 8:', error.message);
}

// PASO 9: Personal
console.log('\n🔄 PASO 9: Configurando personal...');
try {
  const personalHandler = require('./api/personal');
  app.use('/api/personal', adaptHandler(personalHandler));
  console.log('✅ PASO 9 completado - Personal configurado');
} catch (error) {
  console.error('❌ Error en PASO 9:', error.message);
}
*/

// Middleware 404
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Ruta no encontrada',
    method: req.method,
    url: req.originalUrl
  });
});

console.log('\n🚀 Iniciando servidor...');

const PORT = process.env.PORT || 3001; // Puerto diferente para evitar conflicto
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 Probando: http://localhost:${PORT}/api/users/test/123`);
  console.log(`🔗 Probando: http://localhost:${PORT}/`);
});