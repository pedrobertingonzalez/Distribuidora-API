const { ValidationError, NotFoundError } = require('./errors');

const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.name || 'Error'}: ${err.message}`);

    if (err instanceof ValidationError || err instanceof NotFoundError) {
        return res.status(err.status).json({ error: err.message });
    }

    res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
};

module.exports = errorHandler;
