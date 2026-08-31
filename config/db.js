const mongoose = require('mongoose');

async function conectarDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[MONGO] Conectado a ${mongoose.connection.name}`);
    } catch (error) {
        console.error('[MONGO] No se pudo conectar a MongoDB. ¿Está corriendo el servicio local (mongod)?');
        console.error('[MONGO] Detalle:', error.message);
        process.exit(1);
    }
}

module.exports = conectarDB;
