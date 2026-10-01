const express = require('express');
const router = express.Router();
const { requiereRol } = require('../middlewares/roles.middlewares');

const { consultarAgente } = require('../services/agente');

router.post('/', requiereRol('admin'), async (req, res) =>{
    const agente = await consultarAgente(req.body.mensaje);
    res.status(201).json({agente});
})

module.exports = router