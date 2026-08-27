const express = require('express');
const router = express.Router();

const { consultarAgente } = require('../services/agente');

router.post('/', async (req, res, next)=>{
    try{
        const agente = await consultarAgente(req.body.mensaje);
        res.status(201).json({agente});
    } catch (error){
        next(error);
    }
})

module.exports = router