const fs = require('fs').promises;
const path = require('path');
const { NotFoundError, ValidationError } = require('../middlewares/errors');
const { leerClientes } = require('./clientes.services');
const { leerProductos, guardarProducto } = require('./productos.services');

const rutaPedidos = path.join(__dirname, '..', 'data', 'pedidos.json');

async function leerPedidos() {
    const pedidos = await fs.readFile(rutaPedidos, 'utf-8');
    return JSON.parse(pedidos);
}

async function guardarPedido(pedidos) {
    await fs.writeFile(rutaPedidos, JSON.stringify(pedidos, null, 2));
}

async function crearPedido(nuevoPedido) {
    const pedidos = await leerPedidos();
    const clientes = await leerClientes();
    const productos = await leerProductos();

    nuevoPedido.estado = 'pendiente';
    nuevoPedido.fecha = new Date().toLocaleDateString();

    const cliente = clientes.find((c) => c.id === nuevoPedido.idCliente);
    if (!cliente) throw new NotFoundError('Cliente no encontrado');

    const producto = productos.find((p) => p.id === nuevoPedido.idProducto);
    if (!producto) throw new NotFoundError('Producto no encontrado');

    if (typeof nuevoPedido.cantidad !== 'number' || nuevoPedido.cantidad <= 0 || nuevoPedido.cantidad > producto.stock) {
        throw new ValidationError('Cantidad inválida o sin stock suficiente');
    }

    producto.stock -= nuevoPedido.cantidad;
    nuevoPedido.total = nuevoPedido.cantidad * producto.precio;

    const maxId = pedidos.reduce((max, p) => (p.id > max ? p.id : max), 0);
    nuevoPedido.id = maxId + 1;

    await guardarProducto(productos);
    pedidos.push(nuevoPedido);
    await guardarPedido(pedidos);

    return nuevoPedido;
}

async function cancelarPedido(id) {
    const pedidos = await leerPedidos();
    const productos = await leerProductos();

    const idx = pedidos.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundError('Pedido no encontrado');

    const producto = productos.find((p) => p.id === pedidos[idx].idProducto);
    if (!producto) throw new NotFoundError('Producto del pedido no encontrado');

    producto.stock += pedidos[idx].cantidad;
    pedidos[idx].estado = 'cancelado';

    await guardarPedido(pedidos);
    await guardarProducto(productos);
    return pedidos[idx];
}

async function pedidoRealizado(id) {
    const pedidos = await leerPedidos();
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');

    pedido.estado = 'completado';
    await guardarPedido(pedidos);
    return pedido;
}

async function filtrarPedidos(estado) {
    const pedidos = await leerPedidos();
    const resultado = pedidos.filter((p) => p.estado === estado);
    if (resultado.length === 0) throw new NotFoundError('No hay pedidos con ese estado');
    return resultado;
}

module.exports = { leerPedidos, guardarPedido, crearPedido, cancelarPedido, pedidoRealizado, filtrarPedidos };
