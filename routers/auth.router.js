const express = require('express');
const router = express.Router();
const {validate} = require('../middlewares/validate');
const { loginLimiter } = require('../middlewares/rateLimiter.middleware');
const {registrarSchema, loginSchema} = require ('../schemas/auth.schema');
const {registrar, login} = require ('../services/auth.services');


router.post('/register', validate (registrarSchema), async (req, res) =>{
    const nuevoUsuario = await registrar(req.body);
    res.status(201).json(nuevoUsuario);
});

router.post('/login', loginLimiter, validate (loginSchema), async (req, res) =>{
    const usuarioToken = await login(req.body);
    res.status(200).json(usuarioToken);
});

module.exports = router;