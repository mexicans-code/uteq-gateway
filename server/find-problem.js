const express = require('express');
require('dotenv').config();

console.log('🔍 Buscando handler problemático...\n');

const handlers = [
  { name: 'destinosHandler', path: './api/destinos' },
  { name: 'eventosHandler', path: './api/events' },
  { name: 'mostVisitedHandler', path: './api/most-visited' },
  { name: 'registerHandler', path: './api/auth/register' },
  { name: 'loginHandler', path: './api/auth/login' },
  { name: 'usersHandler', path: './api/usersAll' },
  { name: 'usersByIdHandler', path: './api/usersById' },
  { name: 'historialHandler', path: './api/historial' },
  { name: 'reportHandler', path: './api/report' },
  { name: 'personalHandler', path: './api/personal' }
];

for (const handler of handlers) {
  try {
    console.log(`📁 Probando: ${handler.name}...`);
    
    // Crear una nueva app para cada test
    const testApp = express();
    
    // Intentar cargar el handler
    const handlerFunction = require(handler.path);
    console.log(`   ✅ Handler cargado correctamente`);
    
    // Intentar configurar una ruta simple
    testApp.get('/test', handlerFunction);
    console.log(`   ✅ Ruta configurada correctamente`);
    
    // Si llegamos aquí, este handler está bien
    console.log(`   🟢 ${handler.name} - OK\n`);
    
  } catch (error) {
    console.log(`   ❌ ${handler.name} - ERROR:`);
    console.log(`   💡 ${error.message}`);
    console.log(`   📍 Revisa el archivo: ${handler.path}\n`);
    
    // Si encontramos el error, detener la búsqueda
    if (error.message.includes('Missing parameter name')) {
      console.log(`🎯 ENCONTRADO: El problema está en ${handler.name}`);
      console.log(`📂 Archivo problemático: ${handler.path}`);
      break;
    }
  }
}

console.log('🔍 Búsqueda completada.');