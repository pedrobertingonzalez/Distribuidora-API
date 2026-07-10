const Joi = require('joi');

const crearPedidoSchema = Joi.object({
    idCliente: Joi.number().integer().positive().required(),
    idProducto: Joi.number().integer().positive().required(),
    cantidad: Joi.number().integer().min(1).required(),
});

module.exports = { crearPedidoSchema };
