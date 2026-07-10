const fs = require('fs').promises;
const path = require('path');
const { NotFoundError, ValidationError } = require('../middlewares/errors');

const rutaProveedores = path.join(__dirname, '..', 'data', 'proveedores.json');

async function leerProveedores() {
    const proveedores = await fs.readFile(rutaProveedores, 'utf-8');
    return JSON.parse(proveedores);
}

async function guardarProveedores(proveedores) {
    await fs.writeFile(rutaProveedores, JSON.stringify(proveedores, null, 2));
}

async function crearProveedor(nuevoProveedor) {
    const proveedores = await leerProveedores();

    if (!nuevoProveedor.nombre) throw new ValidationError('Falta el nombre');
    if (!nuevoProveedor.email) throw new ValidationError('Falta el email');
    if (typeof nuevoProveedor.telefono !== 'number') throw new ValidationError('Teléfono inválido');
    if (!nuevoProveedor.direccion) throw new ValidationError('Falta la dirección');

    const maxId = proveedores.reduce((max, c) => (c.id > max ? c.id : max), 0);
    nuevoProveedor.id = maxId + 1;

    proveedores.push(nuevoProveedor);
    await guardarProveedores(proveedores);
    return nuevoProveedor;
}

async function eliminarProveedor(id) {
    const proveedores = await leerProveedores();
    const actualizados = proveedores.filter((c) => c.id !== id);

    if (actualizados.length === proveedores.length) throw new NotFoundError('Proveedor no encontrado');

    await guardarProveedores(actualizados);
    return actualizados;
}

module.exports = { leerProveedores, crearProveedor, eliminarProveedor };
