const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require ('../models/user.model');
const {ConflictError, UnauthorizedError} = require('../middlewares/errors');

async function registrar({ nombre, email, password}) {

    const existe = await User.exists({ email });
    if (existe) throw new ConflictError('El email ya está registrado');

    const hash = await bcrypt.hash(password, 12);

    
    let usuario;
    try {
        usuario = await User.create({ nombre, email, password: hash });
    } catch (error) {
        if (error.code === 11000) throw new ConflictError('El email ya está registrado');
        throw error; 
}

    return {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
    };
}



async function login({ email, password }) {
    const usuario = await User.findOne({ email }).select('+password');
    if (!usuario) throw new UnauthorizedError();

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) throw new UnauthorizedError();

    const token = jwt.sign(
        { userId: usuario._id.toString(), rol: usuario.rol, tokenVersion: usuario.tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
        token,
        usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    };
}

module.exports = { registrar, login };