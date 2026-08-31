const Proveedor = require('../models/proveedor.model');
const { NotFoundError } = require('../middlewares/errors');

async function leerProveedores() {
    return Proveedor.find();
}

async function crearProveedor(nuevoProveedor) {
    return Proveedor.create(nuevoProveedor);
}

async function eliminarProveedor(id) {
    const eliminado = await Proveedor.findByIdAndDelete(id);
    if (!eliminado) throw new NotFoundError('Proveedor no encontrado');
    return Proveedor.find();
}

module.exports = { leerProveedores, crearProveedor, eliminarProveedor };
