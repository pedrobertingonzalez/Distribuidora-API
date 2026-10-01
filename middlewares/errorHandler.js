const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.name || 'Error'}: ${err.message}`);

    const status = err.status || 500;
    const mensaje = status === 500 ? 'Error interno del servidor' : err.message;

    res.status(status).json({ error: mensaje });
};

module.exports = errorHandler;
