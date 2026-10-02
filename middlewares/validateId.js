const Joi = require('joi');
const { ValidationError } = require('./errors');


const idSchema = Joi.string().hex().length(24).required();

const validateId = (req, res, next) => {
    const { error } = idSchema.validate(req.params.id);
    if (error) return next(new ValidationError('ID inválido'));
    next();
};

module.exports = { validateId };