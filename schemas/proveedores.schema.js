const Joi = require('joi');

const crearProveedorSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    telefono: Joi.string().required(),
    categoria: Joi.string().min(2).max(100).required(),
});

module.exports = { crearProveedorSchema };
