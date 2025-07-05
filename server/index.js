const express = require('express');
const cors = require('cors');
require('dotenv').config();



const app = express();

app.use(cors());
app.use(express.json());

const destinosHandler = require('./api/destinos');
const eventosHandler = require('./api/events');
const mostVisitedHandler = require('./api/most-visited');


function adaptHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}

app.use('/api/destinos', adaptHandler(destinosHandler));
app.use('/api/events', adaptHandler(eventosHandler));
app.use('/api/most-visited', adaptHandler(mostVisitedHandler));

app.get('/', (req, res) => {
  res.json({ 
    message: 'UTEQ Gateway API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});