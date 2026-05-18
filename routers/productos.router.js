const express = require('express');
const router = express.Router();

const {
    leerProductos,
    crearProducto,
    productosPorProveedor,
    stockBajo
} = require ('../services/productos.services');

router.get('/', async (req, res ,next)=>{
    try{
        const productos = await leerProductos();
        res.status(200).json({productos});
    } catch (error){
        next(error);
    }
});

router.get('/proveedor', async (req, res ,next)=>{
    try{
        const idProveedor = parseInt(req.query.idProveedor);
        const productosProveedor = await productosPorProveedor(idProveedor);
        res.status(200).json({productosProveedor});
    } catch (error){
        next(error);
    }
});

router.get('/stockBajo', async (req, res ,next)=>{
    try{
        const stock = await stockBajo();
        res.status(200).json({stock});
    } catch (error){
        next(error);
    }
});

router.post('/', async (req, res ,next)=>{
    try{
        const crear = await crearProducto(req.body);
        res.status(201).json({crear});
    } catch (error){
        next(error);
    }
});

module.exports = router