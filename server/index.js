const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🔍 Variables de entorno cargadas:');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Configurado' : 'NO CONFIGURADO');
console.log('DB_NAME:', process.env.DB_NAME);

const app = express();

app.use(cors());
app.use(express.json());

// Importar handlers
const destinosHandler = require('./api/destinos');
const eventosHandler = require('./api/events');
const mostVisitedHandler = require('./api/most-visited');
const registerHandler = require('./api/auth/register');
const loginHandler = require('./api/auth/login');
const usersHandler = require('./api/usersAll');
const historialHandler = require('./api/historial');
const personalHandler = require('./api/personal');
const reportHandler = require('./api/report');

// Adaptador para manejar errores async
function adaptHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Error en handler:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}

// Rutas
app.use('/api/destinos', adaptHandler(destinosHandler));
app.use('/api/events', adaptHandler(eventosHandler));
app.use('/api/most-visited', adaptHandler(mostVisitedHandler));
app.use('/api/users', adaptHandler(usersHandler));
app.use('/api/historial', adaptHandler(historialHandler));

app.use('/api/auth/register', adaptHandler(registerHandler));
app.use('/api/auth/login', adaptHandler(loginHandler));

app.use('/api/personal', adaptHandler(personalHandler));
app.use('/api/report', adaptHandler(reportHandler));

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'UTEQ Gateway API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
