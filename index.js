require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const conectarDB = require('./config/db');
const app = express();

app.use(helmet());
// TODO producción: reemplazar por cors({ origin: 'https://tu-dominio.com' })
app.use(cors());
app.use(express.json());

const logger = require('./middlewares/logger');
app.use(logger);

const clientesRouter = require('./routers/clientes.router');
app.use('/clientes', clientesRouter);

const pedidosRouter = require('./routers/pedidos.router');
app.use('/pedidos', pedidosRouter);

const productosRouter = require('./routers/productos.router');
app.use('/productos', productosRouter);

const proveedoresRouter = require('./routers/proveedores.router');
app.use('/proveedores', proveedoresRouter);

const agenteRouter = require('./routers/agente.router');
app.use('/agente', agenteRouter);

const agenteLlamaRouter = require('./routers/agente-llama.router');
app.use('/agente-llama', agenteLlamaRouter);

const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

async function iniciar() {
    await conectarDB();
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
    });
}

iniciar();

process.on('unhandledRejection', (reason) => {
    console.error('[PROCESO] unhandledRejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('[PROCESO] uncaughtException:', error);
    process.exit(1);
});

