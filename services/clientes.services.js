const fs = require('fs').promises;
const path = require('path');
const { NotFoundError, ValidationError } = require('../middlewares/errors');

const rutaClientes = path.join(__dirname, '..', 'data', 'clientes.json');

async function leerClientes() {
    const clientes = await fs.readFile(rutaClientes, 'utf-8');
    return JSON.parse(clientes);
}

async function guardarClientes(clientes) {
    await fs.writeFile(rutaClientes, JSON.stringify(clientes, null, 2));
}

async function crearCliente(nuevoCliente) {
    const clientes = await leerClientes();

    if (!nuevoCliente.nombre) throw new ValidationError('Falta el nombre');
    if (!nuevoCliente.email) throw new ValidationError('Falta el email');
    if (typeof nuevoCliente.telefono !== 'number') throw new ValidationError('Teléfono inválido');
    if (!nuevoCliente.direccion) throw new ValidationError('Falta la dirección');

    const maxId = clientes.reduce((max, c) => (c.id > max ? c.id : max), 0);
    nuevoCliente.id = maxId + 1;

    clientes.push(nuevoCliente);
    await guardarClientes(clientes);
    return nuevoCliente;
}

async function eliminarCliente(id) {
    const clientes = await leerClientes();
    const actualizados = clientes.filter((c) => c.id !== id);

    if (actualizados.length === clientes.length) throw new NotFoundError('Cliente no encontrado');

    await guardarClientes(actualizados);
    return actualizados;
}

module.exports = { leerClientes, crearCliente, eliminarCliente };
