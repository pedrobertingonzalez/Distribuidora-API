const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { crearPedidoSchema } = require('../schemas/pedidos.schema');
const { leerPedidos, crearPedido, cancelarPedido, pedidoRealizado, filtrarPedidos } = require('../services/pedidos.services');

router.get('/', async (req, res, next) => {
    try {
        const pedidos = await leerPedidos();
        res.status(200).json({ pedidos });
    } catch (error) {
        next(error);
    }
});

router.get('/estado', async (req, res, next) => {
    try {
        const estado = req.query.estado;
        const filtrar = await filtrarPedidos(estado);
        res.status(200).json({ filtrar });
    } catch (error) {
        next(error);
    }
});

router.post('/', validate(crearPedidoSchema), async (req, res, next) => {
    try {
        const guardar = await crearPedido(req.body);
        res.status(201).json({ guardar });
    } catch (error) {
        next(error);
    }
});

router.patch('/completar/:id', async (req, res, next) => {
    try {
        const realizado = await pedidoRealizado(req.params.id);
        res.status(200).json({ realizado });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const cancelar = await cancelarPedido(req.params.id);
        res.status(200).json({ cancelar });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
