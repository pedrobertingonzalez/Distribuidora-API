const express = require('express');
const router = express.Router();

const {
    leerProveedores,
    crearProveedor,
    eliminarProveedor
} = require ('../services/proveedores.services');

router.get('/', async (req, res ,next)=>{
    try{
        const proveedor = await leerProveedores();
        res.status(200).json({proveedor});
    } catch (error){
        next(error);
    }
});

router.post('/', async (req, res ,next)=>{
    try{
        const crear = await crearProveedor(req.body);
        res.status(201).json({crear});
    } catch (error){
        next(error);
    }
});

router.patch('/:id', async (req, res ,next)=>{
    try{
        const id = parseInt(req.params.id);
        const eliminar = await eliminarProveedor(id);
        res.status(200).json({eliminar});
    } catch (error){
        next(error);
    }
});

module.exports = router