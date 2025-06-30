// server.js o app.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Iniciar servidor
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`🚀 Routes Service running on port ${PORT}`);
});

// Configuración del campus - Base de datos o configuración estática
const CAMPUS_CONFIGURATION = {
  zones: {
    // Edificios Académicos
    EDIFICIO_A: {
      id: 'edificio_a',
      coordinates: { latitude: 20.5872, longitude: -100.3842 },
      connections: ['edificio_b', 'biblioteca', 'entrada_principal'],
      nombre: 'Edificio A - Ingeniería',
      tipo: 'academico',
      descripcion: 'Aulas y laboratorios de ingeniería',
      servicios: ['aulas', 'laboratorios', 'baños', 'wifi'],
      horario: '07:00 - 22:00'
    },
    
    EDIFICIO_B: {
      id: 'edificio_b',
      coordinates: { latitude: 20.5874, longitude: -100.3844 },
      connections: ['edificio_a', 'rectoria', 'cafeteria'],
      nombre: 'Edificio B - Ciencias',
      tipo: 'academico',
      descripcion: 'Aulas de ciencias básicas y matemáticas',
      servicios: ['aulas', 'laboratorios', 'baños'],
      horario: '07:00 - 21:00'
    },

    BIBLIOTECA: {
      id: 'biblioteca',
      coordinates: { latitude: 20.5873, longitude: -100.3839 },
      connections: ['edificio_a', 'zona_verde_central'],
      nombre: 'Biblioteca Central',
      tipo: 'servicio',
      descripcion: 'Biblioteca principal del campus',
      servicios: ['libros', 'computadoras', 'wifi', 'estudio', 'baños'],
      horario: '08:00 - 20:00'
    },

    RECTORIA: {
      id: 'rectoria',
      coordinates: { latitude: 20.5875, longitude: -100.3845 },
      connections: ['administracion', 'edificio_b'],
      nombre: 'Rectoría',
      tipo: 'administrativo',
      descripcion: 'Oficinas de rectoría y dirección',
      servicios: ['oficinas', 'recepcion', 'baños'],
      horario: '08:00 - 17:00'
    },

    ADMINISTRACION: {
      id: 'administracion',
      coordinates: { latitude: 20.5876, longitude: -100.3847 },
      connections: ['rectoria', 'entrada_principal'],
      nombre: 'Administración',
      tipo: 'administrativo',
      descripcion: 'Servicios escolares y administración',
      servicios: ['servicios_escolares', 'pagos', 'kardex', 'baños'],
      horario: '08:00 - 17:00'
    },

    CAFETERIA: {
      id: 'cafeteria',
      coordinates: { latitude: 20.5869, longitude: -100.3843 },
      connections: ['edificio_b', 'zona_verde_central'],
      nombre: 'Cafetería',
      tipo: 'servicio',
      descripcion: 'Área de alimentos y bebidas',
      servicios: ['comida', 'bebidas', 'mesas', 'baños'],
      horario: '07:00 - 19:00'
    },

    ZONA_VERDE_CENTRAL: {
      id: 'zona_verde_central',
      coordinates: { latitude: 20.5871, longitude: -100.3841 },
      connections: ['biblioteca', 'cafeteria', 'estacionamiento'],
      nombre: 'Zona Verde Central',
      tipo: 'recreativo',
      descripcion: 'Área verde central del campus',
      servicios: ['bancas', 'areas_verdes', 'sombra'],
      horario: '24 horas'
    },

    ENTRADA_PRINCIPAL: {
      id: 'entrada_principal',
      coordinates: { latitude: 20.5881, longitude: -100.3850 },
      connections: ['administracion', 'edificio_a', 'estacionamiento'],
      nombre: 'Entrada Principal',
      tipo: 'acceso',
      descripcion: 'Acceso principal al campus',
      servicios: ['vigilancia', 'informacion'],
      horario: '06:00 - 23:00'
    },

    ESTACIONAMIENTO: {
      id: 'estacionamiento',
      coordinates: { latitude: 20.5879, longitude: -100.3852 },
      connections: ['entrada_principal', 'zona_verde_central'],
      nombre: 'Estacionamiento Principal',
      tipo: 'servicio',
      descripcion: 'Estacionamiento para estudiantes y personal',
      servicios: ['estacionamiento', 'vigilancia'],
      horario: '06:00 - 23:00'
    }
  },

  routes: {
    // Rutas principales dentro del campus
    'entrada_principal_to_rectoria': {
      path: [
        { latitude: 20.5881, longitude: -100.3850 },
        { latitude: 20.5878, longitude: -100.3848 },
        { latitude: 20.5875, longitude: -100.3845 }
      ],
      distance: 180,
      duration: 140,
      difficulty: 'facil',
      instructions: [
        "Desde la entrada principal, dirígete hacia el edificio administrativo",
        "Continúa por el sendero principal del campus",
        "Gira a la derecha hacia el edificio de Rectoría"
      ],
      landmarks: ['fuente_central', 'jardin_rectoría'],
      accessibility: true
    },

    'entrada_principal_to_biblioteca': {
      path: [
        { latitude: 20.5881, longitude: -100.3850 },
        { latitude: 20.5877, longitude: -100.3846 },
        { latitude: 20.5874, longitude: -100.3842 },
        { latitude: 20.5873, longitude: -100.3839 }
      ],
      distance: 240,
      duration: 180,
      difficulty: 'facil',
      instructions: [
        "Desde la entrada principal, camina hacia el área académica",
        "Pasa por el Edificio A",
        "Continúa hacia la biblioteca al este del campus"
      ],
      landmarks: ['plaza_central', 'jardin_biblioteca'],
      accessibility: true
    },

    'biblioteca_to_cafeteria': {
      path: [
        { latitude: 20.5873, longitude: -100.3839 },
        { latitude: 20.5871, longitude: -100.3841 },
        { latitude: 20.5869, longitude: -100.3843 }
      ],
      distance: 120,
      duration: 90,
      difficulty: 'facil',
      instructions: [
        "Desde la biblioteca, dirígete hacia la zona verde central",
        "Atraviesa el área verde",
        "Llega a la cafetería"
      ],
      landmarks: ['zona_verde_central'],
      accessibility: true
    },

    'rectoria_to_edificio_a': {
      path: [
        { latitude: 20.5875, longitude: -100.3845 },
        { latitude: 20.5873, longitude: -100.3843 },
        { latitude: 20.5872, longitude: -100.3842 }
      ],
      distance: 95,
      duration: 70,
      difficulty: 'facil',
      instructions: [
        "Desde Rectoría, camina hacia el área académica",
        "Dirígete al Edificio A de Ingeniería"
      ],
      landmarks: ['plaza_academica'],
      accessibility: true
    },

    // Ruta completa del campus
    'tour_completo_campus': {
      path: [
        { latitude: 20.5881, longitude: -100.3850 }, // Entrada
        { latitude: 20.5879, longitude: -100.3852 }, // Estacionamiento
        { latitude: 20.5876, longitude: -100.3847 }, // Administración
        { latitude: 20.5875, longitude: -100.3845 }, // Rectoría
        { latitude: 20.5872, longitude: -100.3842 }, // Edificio A
        { latitude: 20.5874, longitude: -100.3844 }, // Edificio B
        { latitude: 20.5873, longitude: -100.3839 }, // Biblioteca
        { latitude: 20.5871, longitude: -100.3841 }, // Zona Verde
        { latitude: 20.5869, longitude: -100.3843 }, // Cafetería
        { latitude: 20.5881, longitude: -100.3850 }  // Regreso a entrada
      ],
      distance: 650,
      duration: 480,
      difficulty: 'moderado',
      instructions: [
        "Inicia en la entrada principal",
        "Visita el estacionamiento",
        "Dirígete a administración",
        "Continúa a rectoría",
        "Recorre el área académica (Edificios A y B)",
        "Visita la biblioteca",
        "Relájate en la zona verde central",
        "Toma un descanso en la cafetería",
        "Regresa a la entrada principal"
      ],
      landmarks: [
        'entrada_principal', 'estacionamiento', 'plaza_administrativa',
        'jardin_rectoría', 'plaza_academica', 'jardin_biblioteca',
        'zona_verde_central', 'terraza_cafeteria'
      ],
      accessibility: false
    }
  },

  // Configuración adicional del campus
  settings: {
    campus_name: "Universidad Tecnológica de Querétaro",
    campus_code: "UTEQ",
    timezone: "America/Mexico_City",
    default_walking_speed: 1.4, // m/s
    emergency_contacts: {
      seguridad: "442-123-4567",
      enfermeria: "442-123-4568",
      mantenimiento: "442-123-4569"
    },
    operating_hours: {
      weekdays: "06:00 - 23:00",
      weekends: "08:00 - 20:00",
      holidays: "Cerrado"
    }
  },

  // Puntos de interés adicionales
  points_of_interest: [
    {
      id: 'fuente_central',
      name: 'Fuente Central',
      coordinates: { latitude: 20.5874, longitude: -100.3845 },
      type: 'landmark',
      description: 'Fuente decorativa en el centro del campus'
    },
    {
      id: 'jardin_rectoría',
      name: 'Jardín de Rectoría',
      coordinates: { latitude: 20.5875, longitude: -100.3846 },
      type: 'garden',
      description: 'Jardín ornamental frente a rectoría'
    },
    {
      id: 'plaza_academica',
      name: 'Plaza Académica',
      coordinates: { latitude: 20.5873, longitude: -100.3843 },
      type: 'plaza',
      description: 'Plaza central entre edificios académicos'
    }
  ]
};

// Endpoint para obtener la configuración del campus
app.get('/campus-config', (req, res) => {
  try {
    res.json({
      success: true,
      data: CAMPUS_CONFIGURATION,
      zones: CAMPUS_CONFIGURATION.zones,
      routes: CAMPUS_CONFIGURATION.routes,
      settings: CAMPUS_CONFIGURATION.settings,
      points_of_interest: CAMPUS_CONFIGURATION.points_of_interest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener configuración del campus:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint para obtener solo las zonas
app.get('/campus-config/zones', (req, res) => {
  try {
    res.json({
      success: true,
      zones: CAMPUS_CONFIGURATION.zones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener zonas del campus'
    });
  }
});

// Endpoint para obtener solo las rutas
app.get('/campus-config/routes', (req, res) => {
  try {
    res.json({
      success: true,
      routes: CAMPUS_CONFIGURATION.routes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener rutas del campus'
    });
  }
});

// Endpoint para actualizar configuración (opcional)
app.put('/campus-config', (req, res) => {
  try {
    const { zones, routes, settings } = req.body;
    
    if (zones) {
      Object.assign(CAMPUS_CONFIGURATION.zones, zones);
    }
    
    if (routes) {
      Object.assign(CAMPUS_CONFIGURATION.routes, routes);
    }
    
    if (settings) {
      Object.assign(CAMPUS_CONFIGURATION.settings, settings);
    }

    res.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      data: CAMPUS_CONFIGURATION
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración'
    });
  }
});

// Endpoint para obtener información específica de una zona
app.get('/campus-config/zones/:zoneId', (req, res) => {
  try {
    const { zoneId } = req.params;
    const zone = CAMPUS_CONFIGURATION.zones[zoneId.toUpperCase()];
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zona no encontrada'
      });
    }

    res.json({
      success: true,
      zone: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de la zona'
    });
  }
});

