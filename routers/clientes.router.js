const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { requiereRol } = require('../middlewares/roles.middlewares');
const { crearClienteSchema } = require('../schemas/clientes.schema');
const { leerClientes, crearCliente, eliminarCliente } = require('../services/clientes.services');

router.get('/', requiereRol('admin', 'vendedor'), async (req, res) => {
    const clientes = await leerClientes();
    res.status(200).json({ clientes });
});

router.post('/', requiereRol('admin', 'vendedor'), validate(crearClienteSchema), async (req, res) => {
    const crear = await crearCliente(req.body);
    res.status(201).json({ crear });
});

router.patch('/:id', requiereRol('admin'), async (req, res) => {
    const eliminar = await eliminarCliente(req.params.id);
    res.status(200).json({ eliminar });
});

module.exports = router;
