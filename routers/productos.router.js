const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { crearProductoSchema } = require('../schemas/productos.schema');
const { leerProductos, crearProducto, productosPorProveedor, stockBajo, analisisStock, historialIA } = require('../services/productos.services');

router.get('/', async (req, res, next) => {
    try {
        const productos = await leerProductos();
        res.status(200).json({ productos });
    } catch (error) {
        next(error);
    }
});

router.get('/proveedor', async (req, res, next) => {
    try {
        const productosProveedor = await productosPorProveedor(req.query.proveedor);
        res.status(200).json({ productosProveedor });
    } catch (error) {
        next(error);
    }
});

router.get('/stockBajo', async (req, res, next) => {
    try {
        const stock = await stockBajo();
        res.status(200).json({ stock });
    } catch (error) {
        next(error);
    }
});

router.get('/analisis-stock', async (req, res, next) => {
    try {
        const stock = await analisisStock();
        res.status(200).json({ stock });
    } catch (error) {
        next(error);
    }
});

router.post('/', validate(crearProductoSchema), async (req, res, next) => {
    try {
        const crear = await crearProducto(req.body);
        res.status(201).json({ crear });
    } catch (error) {
        next(error);
    }
});

router.post('/historialIA', async (req, res, next) => {
    try {
        const historial = await historialIA(req.body.mensaje);
        res.status(201).json({ historial });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
