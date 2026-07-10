const { ValidationError } = require('./errors');

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,   // devuelve todos los errores, no solo el primero
        stripUnknown: true,  // elimina campos que no están en el schema
        convert: true,       // castea tipos donde tiene sentido (string numérica → number)
    });

    if (error) {
        const mensaje = error.details.map((d) => d.message).join(', ');
        return next(new ValidationError(mensaje));
    }

    req.body = value;
    next();
};

module.exports = { validate };
