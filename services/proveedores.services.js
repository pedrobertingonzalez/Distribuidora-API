const Proveedor = require('../models/proveedor.model');
const Producto = require('../models/producto.model');
const { NotFoundError } = require('../middlewares/errors');

async function leerProveedores() {
    return Proveedor.find({ activo: true });
}

async function crearProveedor(nuevoProveedor) {
    return Proveedor.create(nuevoProveedor);
}

async function eliminarProveedor(id) {
    const proveedor = await Proveedor.findById(id);
    if (!proveedor) throw new NotFoundError('Proveedor no encontrado');

    const tieneProductos = await Producto.exists({ proveedor: id });

    if (tieneProductos) {
        proveedor.activo = false;
        await proveedor.save();
    } else {
        await Proveedor.findByIdAndDelete(id);
    }

    return Proveedor.find({ activo: true });
}

module.exports = { leerProveedores, crearProveedor, eliminarProveedor };
