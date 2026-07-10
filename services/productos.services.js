const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { NotFoundError, ValidationError } = require('../middlewares/errors');
const { leerProveedores } = require('./proveedores.services');

const rutaProductos = path.join(__dirname, '..', 'data', 'productos.json');

async function leerProductos() {
    const productos = await fs.readFile(rutaProductos, 'utf-8');
    return JSON.parse(productos);
}

async function guardarProducto(productos) {
    await fs.writeFile(rutaProductos, JSON.stringify(productos, null, 2));
}

async function crearProducto(nuevoProducto) {
    const productos = await leerProductos();
    const proveedores = await leerProveedores();

    if (!nuevoProducto.nombre) throw new ValidationError('Falta el nombre del producto');
    if (typeof nuevoProducto.precio !== 'number' || nuevoProducto.precio < 0) throw new ValidationError('Precio inválido');
    if (typeof nuevoProducto.stock !== 'number' || nuevoProducto.stock <= 0) throw new ValidationError('Stock inválido');

    const proveedor = proveedores.find((p) => p.id === nuevoProducto.idProveedor);
    if (!proveedor) throw new NotFoundError('Proveedor no encontrado');

    const maxId = productos.reduce((max, p) => (p.id > max ? p.id : max), 0);
    nuevoProducto.id = maxId + 1;

    productos.push(nuevoProducto);
    await guardarProducto(productos);
    return nuevoProducto;
}

async function productosPorProveedor(idProveedor) {
    const productos = await leerProductos();
    const resultado = productos.filter((p) => p.idProveedor === idProveedor);
    if (resultado.length === 0) throw new NotFoundError('No hay productos para ese proveedor');
    return resultado;
}

async function stockBajo() {
    const productos = await leerProductos();
    const bajos = productos.filter((p) => p.stock < 50);
    if (bajos.length === 0) throw new NotFoundError('No hay productos con stock bajo');
    return bajos;
}

// No uses bloques de código ni backticks, solo JSON puro - CONTROL DE OUTPUT
async function analisisStock() {
    const productosStockBajo = await stockBajo();

    const respuesta = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
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
        },
        {
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
        }
    );

    return JSON.parse(respuesta.data.content[0].text);
}

const historial = [];

async function historialIA(mensaje) {
    const productos = await leerProductos();

    historial.push({ role: 'user', content: mensaje });
    const respuesta = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: `Sos un asistente de gestion para distribuidoras. Respondes en español, de forma concisa, profesional. el inventario actual es ${JSON.stringify(productos)}`,
            messages: historial,
        },
        {
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
        }
    );

    const textoClaude = respuesta.data.content[0].text;
    historial.push({ role: 'assistant', content: textoClaude });
    return textoClaude;
}

module.exports = {
    leerProductos,
    guardarProducto,
    crearProducto,
    productosPorProveedor,
    stockBajo,
    analisisStock,
    historialIA,
};
