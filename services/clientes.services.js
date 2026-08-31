const Cliente = require('../models/cliente.model');
const Pedido = require('../models/pedido.model');
const { NotFoundError } = require('../middlewares/errors');

async function leerClientes() {
    return Cliente.find({ activo: true });
}

async function crearCliente(nuevoCliente) {
    return Cliente.create(nuevoCliente);
}

async function eliminarCliente(id) {
    const cliente = await Cliente.findById(id);
    if (!cliente) throw new NotFoundError('Cliente no encontrado');

    const tienePedidos = await Pedido.exists({ cliente: id });

    if (tienePedidos) {
        cliente.activo = false;
        await cliente.save();
    } else {
        await Cliente.findByIdAndDelete(id);
    }

    return Cliente.find({ activo: true });
}

module.exports = { leerClientes, crearCliente, eliminarCliente };
