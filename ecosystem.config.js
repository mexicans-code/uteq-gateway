module.exports = {
    apps: [
      {
        name: 'gateway',
        script: './server/gateway/index.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3000
        }
      },
      {
        name: 'auth-service',
        script: './server/services/auth.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3001
        }
      },
      {
        name: 'users-service',
        script: './server/services/users.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3002
        }
      },
      {
        name: 'events-service',
        script: './server/services/events.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3003
        }
      },
      {
        name: 'destinos-service',
        script: './server/services/destinos.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3004
        }
      },
      {
        name: 'historial-service',
        script: './server/services/historial.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3005
        }
      },
      {
        name: 'most-visited-service',
        script: './server/services/most-visited.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3006
        }
      },
      {
        name: 'routes-service',
        script: './server/services/routes.js',
        instances: 1,
        autorestart: true,
        watch: true,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3007
        }
      }
    ]
  }