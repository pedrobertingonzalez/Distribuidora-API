const mongoose = require('mongoose');
const Cliente = require('../models/cliente.model');
const Producto = require('../models/producto.model');
const Pedido = require('../models/pedido.model');
const { NotFoundError, ValidationError } = require('../middlewares/errors');

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

    if (!mongoose.Types.ObjectId.isValid(cliente)) {
    throw new ValidationError('ID de cliente inválido');
    }

    const clienteExiste = await Cliente.findOne({ _id: cliente, activo: true });
    if (!clienteExiste) throw new NotFoundError('Cliente no encontrado');

    if (!mongoose.Types.ObjectId.isValid(producto)) {
    throw new ValidationError('Producto inválido');
    }

    const productoActualizado = await Producto.findOneAndUpdate(
        { _id: producto, stock: { $gte: cantidad }, activo: true },
        { $inc: { stock: -cantidad } },
        { new: true }
    );

    if (!productoActualizado) {
        const productoExiste = await Producto.findOne({_id: producto, activo: true});
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

    if(pedido.estado !== 'pendiente') throw new ValidationError('El pedido ya esta cancelado o completado');

    await Producto.findByIdAndUpdate(pedido.producto, { $inc: { stock: pedido.cantidad } });



    pedido.estado = 'cancelado';
    await pedido.save();
    return pedido;
}

async function pedidoRealizado(id) {
    const pedido = await Pedido.findById(id);

    if (!pedido) throw new NotFoundError('Pedido no encontrado');

    if(pedido.estado !== 'pendiente') throw new ValidationError('El pedido se encuentra cancelado o completado');

    pedido.estado = 'completado';

    await pedido.save();
    return pedido;
}

async function filtrarPedidos(estado) {
    const resultado = await Pedido.find({ estado }).populate('cliente').populate('producto');
    if (resultado.length === 0) throw new NotFoundError('No hay pedidos con ese estado');
    return resultado;
}

module.exports = { leerPedidosPaginado, crearPedido, cancelarPedido, pedidoRealizado, filtrarPedidos };
