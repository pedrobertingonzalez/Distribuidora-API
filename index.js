require ('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// LOGGER
const logger = require ('./middlewares/logger');
app.use(logger);

// ROUTERS
const clientesRouter = require ('./routers/clientes.router');
app.use('/clientes', clientesRouter);

const pedidosRouter = require ('./routers/pedidos.router');
app.use('/pedidos', pedidosRouter);

const productosRouter = require ('./routers/productos.router');
app.use('/productos', productosRouter);

const proveedoresRouter = require ('./routers/proveedores.router');
app.use('/proveedores', proveedoresRouter);

// ERRORHANDLER
const errorHandler = require ('./middlewares/errorHandler');
app.use(errorHandler);

app.listen(process.env.PORT, ()=>{
    console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});

