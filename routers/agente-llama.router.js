const express = require('express');
const router = express.Router();
const { requiereRol } = require('../middlewares/roles.middlewares');

const { consultarOllama } = require('../services/agenteLlama');

router.post('/', requiereRol('admin'), async (req, res, next)=>{
    try{
        const agenteLlama = await consultarOllama(req.body.mensaje);
        res.status(201).json({agenteLlama});
    } catch (error){
        next(error);
    }
})

module.exports = router