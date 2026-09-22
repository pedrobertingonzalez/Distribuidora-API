const Joi = require('joi');

const registrarSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(8).max(72).required()
})

const loginSchema = Joi.object({
    email: Joi.string().lowercase().email().required().trim(),
    password: Joi.string().required().max(72)
})

module.exports = {registrarSchema, loginSchema};