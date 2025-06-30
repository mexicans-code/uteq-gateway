require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3000;

const services = {
    events: 'http://localhost:3003',
    'most-visited': 'http://localhost:3004',
    'auth' : 'http://localhost:3005',
    'users' : 'http://localhost:3006',
    'destinos' : 'http://localhost:3007',
    'historial' : 'http://localhost:3008',
    'routes' : 'http://localhost:3009'

  };
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/events', (req, res, next) => {
    console.log('Intercepting /events request');
    createProxyMiddleware({
      target: `${services.events}/api/events`,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad Gateway' });
      }
    })(req, res, next);
  });

  app.use('/most-visited', (req, res, next) => {
    console.log('Intercepting /most-visited request');
    createProxyMiddleware({
      target: `${services['most-visited']}/api/most-visited`,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad Gateway' });
      }
    })(req, res, next);
  });

// Auth proxy - CORREGIDO
app.use('/auth', (req, res, next) => {
    console.log('🔄 Intercepting /auth request');
    console.log('Original URL:', req.originalUrl);
    console.log('Target will be:', `${services.auth}/api`);
    
    createProxyMiddleware({
        target: services.auth, // http://localhost:3005
        changeOrigin: true,
        pathRewrite: {
            '^/auth': '/api' // /auth/register -> /api/register
        },
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
            console.log('📤 Proxying request to:', proxyReq.getHeader('host') + proxyReq.path);
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log('📥 Received response:', proxyRes.statusCode);
        },
        onError: (err, req, res) => {
            console.error('❌ Proxy error:', err.message);
            res.status(502).json({ 
                success: false, 
                error: 'Bad Gateway',
                message: 'Error connecting to auth service'
            });
        }
    })(req, res, next);
});

// Ruta de status
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    eventsService: services.events,
    timestamp: new Date().toISOString()
  });
});

app.use('/users', (req, res, next) => {
    console.log('Intercepting /events request');
    createProxyMiddleware({
      target: `${services.users}/api/users`,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad Gateway' });
      }
    })(req, res, next);
  });

  app.use('/destinos', (req, res, next) => {
    console.log('Intercepting /destinos request');
    createProxyMiddleware({
      target: `${services.destinos}/api/destinos`,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad Gateway' });
      }
    })(req, res, next);
  });

  app.use('/routes', (req, res, next) => {
    console.log('Intercepting /routes request');
    createProxyMiddleware({
      target: `${services.routes}/api/routes`,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad Gateway' });
      }
    })(req, res, next);
  });




// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
  console.log(`🔗 Events endpoint: http://localhost:${PORT}/events`);
  console.log(`🔗 Most Visited endpoint: http://localhost:${PORT}/most-visited`);
  console.log(`🔗 Auth endpoint: http://localhost:${PORT}/auth`);
  console.log(`🔗 Users endpoint: http://localhost:${PORT}/users`);
  console.log(`🔗 Destinos endpoint: http://localhost:${PORT}/destinos`);
  console.log(`🔗 Historial endpoint: http://localhost:${PORT}/historial`);
  console.log(`🔗 Routes endpoint: http://localhost:${PORT}/routes`);
});