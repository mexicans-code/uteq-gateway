const connectToDatabase = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const db = await connectToDatabase();
    const visitedCollection = db.collection('visited');
    const mostVisited = await visitedCollection.find().toArray();
    
    res.status(200).json(mostVisited);
  } catch (error) {
    console.error('Error al obtener most-visited:', error);
    res.status(500).json({ error: 'Error al obtener most-visited' });
  }
}

module.exports = handler;