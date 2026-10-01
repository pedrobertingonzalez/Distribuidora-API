const { ValidationError } = require('./errors');

const validate = (schema) => (req, res, next) => {
    // Express 5: si no llegó body, req.body es undefined (no {}). Joi no rechaza
    // undefined, así que sin el `?? {}` el request llegaría al service y daría 500.
    const { error, value } = schema.validate(req.body ?? {}, {
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
