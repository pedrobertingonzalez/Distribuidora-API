const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { requiereRol } = require('../middlewares/roles.middlewares');
const { crearProveedorSchema } = require('../schemas/proveedores.schema');
const { leerProveedores, crearProveedor, eliminarProveedor } = require('../services/proveedores.services');

router.get('/', requiereRol('admin'), async (req, res, next) => {
    try {
        const proveedor = await leerProveedores();
        res.status(200).json({ proveedor });
    } catch (error) {
        next(error);
    }
});

router.post('/', requiereRol('admin'), validate(crearProveedorSchema), async (req, res, next) => {
    try {
        const crear = await crearProveedor(req.body);
        res.status(201).json({ crear });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', requiereRol('admin'), async (req, res, next) => {
    try {
        const eliminar = await eliminarProveedor(req.params.id);
        res.status(200).json({ eliminar });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
