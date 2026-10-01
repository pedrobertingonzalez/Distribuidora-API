const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { requiereRol } = require('../middlewares/roles.middlewares');
const { crearPedidoSchema } = require('../schemas/pedidos.schema');
const { leerPedidosPaginado, crearPedido, cancelarPedido, pedidoRealizado, filtrarPedidos } = require('../services/pedidos.services');

router.get('/', requiereRol('admin', 'vendedor'), async (req, res) => {
    const skip = parseInt(req.query.skip) || undefined;
    const limit = parseInt(req.query.limit) || undefined;
    const pedidos = await leerPedidosPaginado({ skip, limit });
    res.status(200).json({ pedidos });
});

router.get('/estado', requiereRol('admin', 'vendedor'), async (req, res) => {
    const estado = req.query.estado;
    const filtrar = await filtrarPedidos(estado);
    res.status(200).json({ filtrar });
});

router.post('/', requiereRol('admin', 'vendedor'), validate(crearPedidoSchema), async (req, res) => {
    const guardar = await crearPedido(req.body);
    res.status(201).json({ guardar });
});

router.patch('/completar/:id', requiereRol('admin', 'vendedor'), async (req, res) => {
    const realizado = await pedidoRealizado(req.params.id);
    res.status(200).json({ realizado });
});

router.patch('/:id', requiereRol('admin', 'vendedor'), async (req, res) => {
    const cancelar = await cancelarPedido(req.params.id);
    res.status(200).json({ cancelar });
});

module.exports = router;
