const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { UnauthorizedError } = require('./errors');

async function verificarToken(req, res, next) {
    try {
        // a. ¿Viene el header?
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Token requerido');
        }
        const token = authHeader.split(' ')[1];

        // b. ¿El token es válido y no venció?
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                throw new UnauthorizedError('Token inválido o expirado');
            }
            throw error;
        }

        // c. ¿El usuario sigue existiendo y la versión coincide?
        const usuario = await User.findById(payload.userId).select('tokenVersion rol');
        if (!usuario || usuario.tokenVersion !== payload.tokenVersion) {
            throw new UnauthorizedError('Token inválido o expirado');
        }

        // d. Dejar los datos disponibles para la ruta
        req.usuario = { id: payload.userId, rol: usuario.rol };
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { verificarToken };