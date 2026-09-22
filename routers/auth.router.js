const express = require('express');
const router = express.Router();
const {validate} = require('../middlewares/validate');
const {registrarSchema, loginSchema} = require ('../schemas/auth.schema');
const {registrar, login} = require ('../services/auth.services');


router.post('/register', validate (registrarSchema), async (req, res, next)=>{
    try{
        const nuevoUsuario = await registrar(req.body);
        res.status(201).json(nuevoUsuario);
    } catch (error){
        next(error);
    }
});

router.post('/login', validate (loginSchema), async (req, res, next)=>{
    try{
        const usuarioToken = await login(req.body);
        res.status(200).json(usuarioToken);
    } catch (error){
        next(error);
    }
});

module.exports = router;