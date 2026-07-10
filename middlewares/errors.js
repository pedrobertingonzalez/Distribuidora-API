class NotFoundError extends Error {
    constructor(message = 'Recurso no encontrado') {
        super(message);
        this.name = 'NotFoundError';
        this.status = 404;
    }
}

class ValidationError extends Error {
    constructor(message = 'Datos inválidos') {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
    }
}

module.exports = { NotFoundError, ValidationError };
