const Joi = require('joi');

const crearProductoSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required(),
    precio: Joi.number().positive().required(),
    stock: Joi.number().integer().min(1).required(),
    idProveedor: Joi.number().integer().positive().required(),
});

module.exports = { crearProductoSchema };
