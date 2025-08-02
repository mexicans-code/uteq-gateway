const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'NovaCode';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no está configurado');
    }

    console.log('🔄 Conectando a MongoDB...');
    const client = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

function extractIdFromUrl(url) {
  const urlWithoutQuery = url.split('?')[0];
  const parts = urlWithoutQuery.split('/').filter(part => part !== '');

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'events' && parts[i + 1]) {
      return { id: parts[i + 1], isStatusUpdate: false };
    }
  }

  if (parts.length >= 1) {
    return { id: parts[0], isStatusUpdate: false };
  }

  return { id: null, isStatusUpdate: false };
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectToDatabase();
    const eventsCollection = db.collection('events');
    const { id: eventId } = extractIdFromUrl(req.url);

    if (req.method === 'GET') {
      if (eventId) {
        let evento = null;

        if (ObjectId.isValid(eventId)) {
          evento = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        }

        if (!evento) {
          evento = await eventsCollection.findOne({ id: eventId.toString() });
        }

        if (!evento) {
          return res.status(404).json({
            success: false,
            message: 'Evento no encontrado'
          });
        }

        return res.json({
          success: true,
          data: evento
        });
      } else {
        // Limpieza automática: eliminar eventos que ya pasaron mitad de tiempo
        const now = new Date();

        let events = await eventsCollection.find().toArray();

        for (const event of events) {
          if (event.fecha_fin && event.hora_fin) {
            const start = new Date(`${event.fecha}T${event.hora}:00`);
            const end = new Date(`${event.fecha_fin}T${event.hora_fin}:00`);
            const midPoint = new Date((start.getTime() + end.getTime()) / 2);

            if (now >= midPoint) {
              await eventsCollection.deleteOne({ _id: event._id });
            }
          }
        }

        events = await eventsCollection.find().sort({ id: 1 }).toArray();

        return res.json({
          success: true,
          count: events.length,
          data: events
        });
      }
    }

    // POST - crear evento
    else if (req.method === 'POST') {
      const {
        id,
        titulo,
        descripcion,
        fecha,
        hora,
        fecha_fin,
        hora_fin,
        ubicacion,
        latitud,
        longitud,
        organizador,
        capacidad,
        estado,
        imagen
      } = req.body;

      if (
        !id ||
        !titulo ||
        !descripcion ||
        !fecha ||
        !hora ||
        !fecha_fin ||
        !hora_fin ||
        !ubicacion ||
        latitud == null ||
        longitud == null ||
        !organizador ||
        !imagen
      ) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos'
        });
      }

      // Validar formatos de fecha y hora
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      const horaRegex = /^\d{2}:\d{2}$/;
      if (!fechaRegex.test(fecha) || (fecha_fin && !fechaRegex.test(fecha_fin))) {
        return res.status(400).json({ success: false, message: 'Formato de fecha inválido' });
      }
      if (!horaRegex.test(hora) || (hora_fin && !horaRegex.test(hora_fin))) {
        return res.status(400).json({ success: false, message: 'Formato de hora inválido' });
      }

      // Validar latitud y longitud como números
      if (typeof latitud !== 'number' || typeof longitud !== 'number') {
        return res.status(400).json({ success: false, message: 'Latitud y longitud deben ser números' });
      }

      const existingEvent = await eventsCollection.findOne({ id: id.toString() });
      if (existingEvent) {
        return res.status(400).json({ success: false, message: 'ID duplicado' });
      }

      const nuevoEvento = {
        id: id.toString(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha,
        hora,
        fecha_fin: fecha_fin,
        hora_fin: hora_fin,
        ubicacion: ubicacion.trim(),
        latitud,
        longitud,
        organizador: organizador.trim(),
        capacidad: capacidad || null,
        estado: estado || 'activo',
        imagen: imagen.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await eventsCollection.insertOne(nuevoEvento);
      return res.status(201).json({
        success: true,
        message: 'Evento creado correctamente',
        data: { _id: result.insertedId, ...nuevoEvento }
      });
    }

    // PUT - actualizar evento
    else if (req.method === 'PUT') {
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'ID requerido para actualizar' });
      }

      const {
        titulo,
        descripcion,
        fecha,
        hora,
        fecha_fin,
        hora_fin,
        ubicacion,
        latitud,
        longitud,
        organizador,
        capacidad,
        estado,
        imagen
      } = req.body;

      if (
        !titulo ||
        !descripcion ||
        !fecha ||
        !hora ||
        !fecha_fin ||
        !hora_fin ||
        !ubicacion ||
        latitud == null ||
        longitud == null ||
        !organizador ||
        !imagen
      ) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos para actualizar'
        });
      }

      // Validar formatos de fecha y hora
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      const horaRegex = /^\d{2}:\d{2}$/;
      if (!fechaRegex.test(fecha) || (fecha_fin && !fechaRegex.test(fecha_fin))) {
        return res.status(400).json({ success: false, message: 'Formato de fecha inválido' });
      }
      if (!horaRegex.test(hora) || (hora_fin && !horaRegex.test(hora_fin))) {
        return res.status(400).json({ success: false, message: 'Formato de hora inválido' });
      }

      // Validar latitud y longitud como números
      if (typeof latitud !== 'number' || typeof longitud !== 'number') {
        return res.status(400).json({ success: false, message: 'Latitud y longitud deben ser números' });
      }

      const updateData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha,
        hora,
        fecha_fin: fecha_fin || null,
        hora_fin: hora_fin || null,
        ubicacion: ubicacion.trim(),
        latitud,
        longitud,
        organizador: organizador.trim(),
        capacidad: capacidad || null,
        estado: estado || 'activo',
        imagen: imagen.trim(),
        updatedAt: new Date()
      };

      let result;
      if (ObjectId.isValid(eventId)) {
        result = await eventsCollection.updateOne(
          { _id: new ObjectId(eventId) },
          { $set: updateData }
        );
      }

      if (!result || result.matchedCount === 0) {
        result = await eventsCollection.updateOne(
          { id: eventId.toString() },
          { $set: updateData }
        );
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Evento no encontrado para actualizar' });
      }

      const eventoActualizado = await eventsCollection.findOne(
        ObjectId.isValid(eventId)
          ? { _id: new ObjectId(eventId) }
          : { id: eventId.toString() }
      );

      return res.json({
        success: true,
        message: 'Evento actualizado correctamente',
        data: eventoActualizado
      });
    }

    // DELETE - eliminar evento
    else if (req.method === 'DELETE') {
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'ID requerido para eliminar' });
      }

      let result;
      if (ObjectId.isValid(eventId)) {
        result = await eventsCollection.deleteOne({ _id: new ObjectId(eventId) });
      }

      if (!result || result.deletedCount === 0) {
        result = await eventsCollection.deleteOne({ id: eventId.toString() });
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Evento no encontrado para eliminar' });
      }

      return res.json({
        success: true,
        message: 'Evento eliminado correctamente'
      });
    }

    // PATCH - actualizar solo estado
    else if (req.method === 'PATCH') {
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'ID requerido para actualizar estado'
        });
      }

      if (!req.body || typeof req.body.estado !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Campo "estado" requerido en el cuerpo'
        });
      }

      const { estado } = req.body;
      const updateData = {
        estado: estado.trim(),
        updatedAt: new Date()
      };

      let result;
      if (ObjectId.isValid(eventId)) {
        result = await eventsCollection.updateOne(
          { _id: new ObjectId(eventId) },
          { $set: updateData }
        );
      }

      if (!result || result.matchedCount === 0) {
        result = await eventsCollection.updateOne(
          { id: eventId.toString() },
          { $set: updateData }
        );
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado para actualizar estado'
        });
      }

      const eventoActualizado = await eventsCollection.findOne(
        ObjectId.isValid(eventId)
          ? { _id: new ObjectId(eventId) }
          : { id: eventId.toString() }
      );

      return res.json({
        success: true,
        message: 'Estado actualizado correctamente',
        data: eventoActualizado
      });
    }

    // Métodos no permitidos
    else {
      return res.status(405).json({
        success: false,
        message: 'Método no permitido',
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      });
    }
  } catch (error) {
    console.error('❌ Error en handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

process.on('SIGINT', async () => {
  if (cachedClient) {
    await cachedClient.close();
  }
  process.exit(0);
});

module.exports = handler;
