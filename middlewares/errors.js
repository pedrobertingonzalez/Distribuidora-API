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

class ConflictError extends Error {
    constructor(message = 'Conflicto con un recurso existente') {
        super(message);
        this.name = 'ConflictError';
        this.status = 409;
    }
}

class UnauthorizedError extends Error {
    constructor(message = 'credenciales invalidas') {
        super(message);
        this.name = 'UnauthorizedError';
        this.status = 401;
    }
}

class ForbiddenError extends Error {
    constructor(message = 'No tenés permiso para realizar esta acción') {
        super(message);
        this.name = 'ForbiddenError';
        this.status = 403;
    }
}

module.exports = { NotFoundError, ValidationError, ConflictError, UnauthorizedError, ForbiddenError };
