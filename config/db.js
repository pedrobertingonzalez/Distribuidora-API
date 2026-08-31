const mongoose = require('mongoose');

mongoose.connection.on('disconnected', () => {
    console.warn('[MONGO] Conexión perdida. El driver intentará reconectar automáticamente.');
});

mongoose.connection.on('reconnected', () => {
    console.log('[MONGO] Reconectado a MongoDB.');
});

mongoose.connection.on('error', (error) => {
    console.error('[MONGO] Error de conexión:', error.message);
});

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
