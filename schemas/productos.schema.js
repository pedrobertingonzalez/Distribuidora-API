const Joi = require('joi');

const crearProductoSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required(),
    precio: Joi.number().positive().required(),
    stock: Joi.number().integer().min(1).required(),
    proveedor: Joi.string().hex().length(24).required(),
});

const modificarProductoSchema = Joi.object({
    nombre: Joi.string().min(2).max(100),
    precio: Joi.number().positive(),
    stock: Joi.number().integer().min(0),
    proveedor: Joi.string().hex().length(24),
}).min(1);

module.exports = { crearProductoSchema, modificarProductoSchema };
