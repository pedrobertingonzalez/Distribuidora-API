const { ForbiddenError } = require('./errors');

const requiereRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return next(new ForbiddenError('Middleware de roles usado sin verificarToken previo'));
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return next(new ForbiddenError());
        }

        next();
    };
};

module.exports = { requiereRol };