const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { crearClienteSchema } = require('../schemas/clientes.schema');
const { leerClientes, crearCliente, eliminarCliente } = require('../services/clientes.services');

router.get('/', async (req, res, next) => {
    try {
        const clientes = await leerClientes();
        res.status(200).json({ clientes });
    } catch (error) {
        next(error);
    }
});

router.post('/', validate(crearClienteSchema), async (req, res, next) => {
    try {
        const crear = await crearCliente(req.body);
        res.status(201).json({ crear });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const eliminar = await eliminarCliente(id);
        res.status(200).json({ eliminar });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
