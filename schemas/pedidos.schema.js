const Joi = require('joi');

const crearPedidoSchema = Joi.object({
    cliente: Joi.string().hex().length(24).required(),
    producto: Joi.string().hex().length(24).required(),
    cantidad: Joi.number().integer().min(1).required(),
});

module.exports = { crearPedidoSchema };
