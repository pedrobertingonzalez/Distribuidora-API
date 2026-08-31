const Producto = require('../models/producto.model');
const Proveedor = require('../models/proveedor.model');
const { anthropicClient } = require('./axiosClient');
const { NotFoundError, ValidationError } = require('../middlewares/errors');

async function leerProductos() {
    return Producto.find();
}

async function crearProducto(nuevoProducto) {
    const { nombre, precio, stock, proveedor } = nuevoProducto;

    if (!nombre) throw new ValidationError('Falta el nombre del producto');
    if (typeof precio !== 'number' || precio < 0) throw new ValidationError('Precio inválido');
    if (typeof stock !== 'number' || stock <= 0) throw new ValidationError('Stock inválido');

    const proveedorExiste = await Proveedor.findById(proveedor);
    if (!proveedorExiste) throw new NotFoundError('Proveedor no encontrado');

    return Producto.create({ nombre, precio, stock, proveedor });
}

async function productosPorProveedor(idProveedor) {
    const resultado = await Producto.find({ proveedor: idProveedor });
    if (resultado.length === 0) throw new NotFoundError('No hay productos para ese proveedor');
    return resultado;
}

async function stockBajo() {
    const bajos = await Producto.find({ stock: { $lt: 50 } });
    if (bajos.length === 0) throw new NotFoundError('No hay productos con stock bajo');
    return bajos;
}

// No uses bloques de código ni backticks, solo JSON puro - CONTROL DE OUTPUT
async function analisisStock() {
    const productosStockBajo = await stockBajo();

    const respuesta = await anthropicClient.post('/messages', {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `Sos un asistente de gestion para distribuidoras. No uses bloques de código ni backticks, solo JSON puro. Respondes en español, de forma concisa, profesional y formato JSON con la siguiente estructura, sin texto adicional:
            {"productos":[{"nombre": "", "cantidad": 0, "proveedor": ""}]} `,
        messages: [
            {
                role: 'user',
                content: `Estos productos tienen stock critico: ${JSON.stringify(productosStockBajo)} ¿cuanto deberia pedir de cada uno y a que proveedor?`,
            },
        ],
    });

    return JSON.parse(respuesta.data.content[0].text);
}

const historial = [];

async function historialIA(mensaje) {
    const productos = await leerProductos();

    historial.push({ role: 'user', content: mensaje });
    const respuesta = await anthropicClient.post('/messages', {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `Sos un asistente de gestion para distribuidoras. Respondes en español, de forma concisa, profesional. el inventario actual es ${JSON.stringify(productos)}`,
        messages: historial,
    });

    const textoClaude = respuesta.data.content[0].text;
    historial.push({ role: 'assistant', content: textoClaude });
    return textoClaude;
}

module.exports = {
    leerProductos,
    crearProducto,
    productosPorProveedor,
    stockBajo,
    analisisStock,
    historialIA,
};
