const Joi = require('joi');

const crearProveedorSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    telefono: Joi.number().integer().positive().required(),
    direccion: Joi.string().min(5).max(200).required(),
});

module.exports = { crearProveedorSchema };
