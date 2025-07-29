require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3000;

const services = {
    events: 'http://localhost:3003',
    'most-visited': 'http://localhost:3004',
    'auth': 'http://localhost:3005',
    'users': 'http://localhost:3006',
    'personal': 'http://localhost:3007',
    'destinos': 'http://localhost:3008',
    'historial': 'http://localhost:3009',
    'routes': 'http://localhost:3010',
    'report': 'http://localhost:3011',
    'userbyid': 'http://localhost:3012'
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

// Auth proxy
app.use('/auth', (req, res, next) => {
    console.log('🔄 Intercepting /auth request');
    console.log('Original URL:', req.originalUrl);
    console.log('Target will be:', `${services.auth}/api`);
    
    createProxyMiddleware({
        target: services.auth,
        changeOrigin: true,
        pathRewrite: {
            '^/auth': '/api'
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

// ✅ CORREGIDO: Users con ID dinámico usando métodos específicos
app.get('/users/:id', (req, res, next) => {
    console.log('🔄 Intercepting GET /users/:id request');
    console.log('User ID:', req.params.id);
    
    createProxyMiddleware({
        target: services.userbyid,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/users/${req.params.id}`;
        },
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
            console.log('📤 Proxying GET user request to:', proxyReq.getHeader('host') + proxyReq.path);
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log('📥 Received GET user response:', proxyRes.statusCode);
        },
        onError: (err, req, res) => {
            console.error('❌ Proxy error for GET user:', err.message);
            res.status(502).json({ 
                success: false, 
                error: 'Bad Gateway',
                message: 'Error connecting to users service'
            });
        }
    })(req, res, next);
});

app.put('/users/:id', (req, res, next) => {
    console.log('🔄 Intercepting PUT /users/:id request');
    console.log('User ID:', req.params.id);
    
    createProxyMiddleware({
        target: services.userbyid,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/users/${req.params.id}`;
        },
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
            console.log('📤 Proxying PUT user request to:', proxyReq.getHeader('host') + proxyReq.path);
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log('📥 Received PUT user response:', proxyRes.statusCode);
        },
        onError: (err, req, res) => {
            console.error('❌ Proxy error for PUT user:', err.message);
            res.status(502).json({ 
                success: false, 
                error: 'Bad Gateway',
                message: 'Error connecting to users service'
            });
        }
    })(req, res, next);
});

app.delete('/users/:id', (req, res, next) => {
    console.log('🔄 Intercepting DELETE /users/:id request');
    console.log('User ID:', req.params.id);
    
    createProxyMiddleware({
        target: services.userbyid,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/users/${req.params.id}`;
        },
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
            console.log('📤 Proxying DELETE user request to:', proxyReq.getHeader('host') + proxyReq.path);
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log('📥 Received DELETE user response:', proxyRes.statusCode);
        },
        onError: (err, req, res) => {
            console.error('❌ Proxy error for DELETE user:', err.message);
            res.status(502).json({ 
                success: false, 
                error: 'Bad Gateway',
                message: 'Error connecting to users service'
            });
        }
    })(req, res, next);
});

// Users general (para listar todos, crear nuevos, etc.) - DEBE IR DESPUÉS de las rutas específicas
app.use('/users', (req, res, next) => {
    console.log('🔄 Intercepting /users request (general)');
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

app.use('/report', (req, res, next) => {
    console.log('Intercepting /report request');
    createProxyMiddleware({
      target: `${services.report}/api/report`,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Bad Gateway' });
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
  console.log(`🔗 Events endpoint: http://localhost:${PORT}/events`);
  console.log(`🔗 Most Visited endpoint: http://localhost:${PORT}/most-visited`);
  console.log(`🔗 Auth endpoint: http://localhost:${PORT}/auth`);
  console.log(`🔗 Users endpoint: http://localhost:${PORT}/users`);
  console.log(`🔗 Individual User endpoints:`);
  console.log(`    GET    http://localhost:${PORT}/users/:id`);
  console.log(`    PUT    http://localhost:${PORT}/users/:id`);
  console.log(`    DELETE http://localhost:${PORT}/users/:id`);
  console.log(`🔗 Destinos endpoint: http://localhost:${PORT}/destinos`);
  console.log(`🔗 Routes endpoint: http://localhost:${PORT}/routes`);
  console.log(`🔗 Report endpoint: http://localhost:${PORT}/report`);
});