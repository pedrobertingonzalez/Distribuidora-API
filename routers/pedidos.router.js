const express = require('express');
const router = express.Router();

const {
    leerPedidos,
    crearPedido,
    guardarPedido,
    cancelarPedido,
    pedidoRealizado,
    filtrarPedidos
} = require ('../services/pedidos.services');

    // leerPedidos
router.get('/', async (req, res ,next)=>{
    try{
        const pedidos = await leerPedidos();
        res.status(200).json({pedidos});
    } catch (error){
        next(error);
    }
});

    // filtrarPedidos
router.get('/estado', async (req, res ,next)=>{
    try{
        const estado = req.query.estado;
        const filtrar = await filtrarPedidos(estado);
        res.status(200).json({filtrar});
    } catch (error){
        next(error);
    }
});

    // crearPedido
router.post('/', async (req, res ,next)=>{
    try{
        const guardar = await crearPedido(req.body);
        res.status(201).json({guardar});
    } catch (error){
        next(error);
    }
});

    // pedidoRealizado
router.patch('/completar/:id', async (req, res ,next)=>{
    try{
        const id = parseInt(req.params.id);
        const realizado =await pedidoRealizado(id);
        res.status(200).json({realizado});
    } catch (error){
        next(error);
    }
});

    // cancelarPedido
router.patch('/:id', async (req, res ,next)=>{
    try{
        const id = parseInt(req.params.id);
        const cancelar =await cancelarPedido(id);
        res.status(200).json({cancelar});
    } catch (error){
        next(error);
    }
});


module.exports = router