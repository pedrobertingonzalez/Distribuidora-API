const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { requiereRol } = require('../middlewares/roles.middlewares');
const { crearProductoSchema } = require('../schemas/productos.schema');
const { leerProductosPaginado, crearProducto, productosPorProveedor, stockBajo, analisisStock, historialIA } = require('../services/productos.services');

router.get('/', requiereRol('admin', 'vendedor'), async (req, res) => {
    const skip = parseInt(req.query.skip) || undefined;
    const limit = parseInt(req.query.limit) || undefined;
    const productos = await leerProductosPaginado({ skip, limit });
    res.status(200).json({ productos });
});

router.get('/proveedor', requiereRol('admin', 'vendedor'), async (req, res) => {
    const productosProveedor = await productosPorProveedor(req.query.proveedor);
    res.status(200).json({ productosProveedor });
});

router.get('/stockBajo', requiereRol('admin', 'vendedor'), async (req, res) => {
    const stock = await stockBajo();
    res.status(200).json({ stock });
});

router.get('/analisis-stock', requiereRol('admin'), async (req, res) => {
    const stock = await analisisStock();
    res.status(200).json({ stock });
});

router.post('/', requiereRol('admin'), validate(crearProductoSchema), async (req, res) => {
    const crear = await crearProducto(req.body);
    res.status(201).json({ crear });
});

router.post('/historialIA', requiereRol('admin'), async (req, res) => {
    const historial = await historialIA(req.body.mensaje);
    res.status(201).json({ historial });
});

module.exports = router;
