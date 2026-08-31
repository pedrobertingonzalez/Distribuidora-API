const Cliente = require('../models/cliente.model');
const { NotFoundError } = require('../middlewares/errors');

async function leerClientes() {
    return Cliente.find();
}

async function crearCliente(nuevoCliente) {
    return Cliente.create(nuevoCliente);
}

async function eliminarCliente(id) {
    const eliminado = await Cliente.findByIdAndDelete(id);
    if (!eliminado) throw new NotFoundError('Cliente no encontrado');
    return Cliente.find();
}

module.exports = { leerClientes, crearCliente, eliminarCliente };
