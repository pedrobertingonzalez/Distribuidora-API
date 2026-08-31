const Cliente = require('../models/cliente.model');
const Producto = require('../models/producto.model');
const Pedido = require('../models/pedido.model');
const { NotFoundError, ValidationError } = require('../middlewares/errors');

async function leerPedidos() {
    return Pedido.find().populate('cliente').populate('producto');
}

async function leerPedidosPaginado({ skip, limit } = {}) {
    let query = Pedido.find().populate('cliente').populate('producto');
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);
    return query;
}

async function crearPedido(nuevoPedido) {
    const { cliente, producto, cantidad } = nuevoPedido;

    if (typeof cantidad !== 'number' || cantidad <= 0) {
        throw new ValidationError('Cantidad inválida o sin stock suficiente');
    }

    const clienteExiste = await Cliente.findOne({ _id: cliente, activo: true });
    if (!clienteExiste) throw new NotFoundError('Cliente no encontrado');

    const productoActualizado = await Producto.findOneAndUpdate(
        { _id: producto, stock: { $gte: cantidad } },
        { $inc: { stock: -cantidad } },
        { new: true }
    );

    if (!productoActualizado) {
        const productoExiste = await Producto.findById(producto);
        if (!productoExiste) throw new NotFoundError('Producto no encontrado');
        throw new ValidationError('Cantidad inválida o sin stock suficiente');
    }

    const pedido = await Pedido.create({
        cliente,
        producto,
        cantidad,
        total: cantidad * productoActualizado.precio,
    });

    return pedido;
}

async function cancelarPedido(id) {
    const pedido = await Pedido.findById(id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');

    await Producto.findByIdAndUpdate(pedido.producto, { $inc: { stock: pedido.cantidad } });

    pedido.estado = 'cancelado';
    await pedido.save();
    return pedido;
}

async function pedidoRealizado(id) {
    const pedido = await Pedido.findByIdAndUpdate(id, { estado: 'completado' }, { new: true });
    if (!pedido) throw new NotFoundError('Pedido no encontrado');
    return pedido;
}

async function filtrarPedidos(estado) {
    const resultado = await Pedido.find({ estado }).populate('cliente').populate('producto');
    if (resultado.length === 0) throw new NotFoundError('No hay pedidos con ese estado');
    return resultado;
}

module.exports = { leerPedidos, leerPedidosPaginado, crearPedido, cancelarPedido, pedidoRealizado, filtrarPedidos };
