// Pedidos — id, idCliente, idProducto, cantidad, total, estado ("pendiente" / "completado" / "cancelado"), fecha
// Pedidos: crear (descuenta stock, calcula total, fecha automática), cancelar (devuelve stock), completar, filtrar por estado

// -No se puede crear un pedido sin stock suficiente
// -El total se calcula automáticamente: precio × cantidad
// -La fecha se asigna automáticamente al crear
// -El estado al crear siempre es "pendiente"

const fs = require ('fs').promises;
const path = require ('path');

const rutaPedidos = path.join(__dirname, '..', 'data', 'pedidos.json');

const {
    leerClientes
} = require ('./clientes.services');

const {
    leerProductos,
    guardarProducto
} = require ('./productos.services');

async function leerPedidos(){
    const pedidos = await fs.readFile(rutaPedidos, 'utf-8');
    return JSON.parse(pedidos);
}


async function guardarPedido(nuevoPedido){
    const pedidosEnTexto = JSON.stringify(nuevoPedido, null, 2);
    await fs.writeFile(rutaPedidos, pedidosEnTexto);
}


async function crearPedido(nuevoPedido){
    
const pedidos = await leerPedidos();
const clientes = await leerClientes();
const productos = await leerProductos();

// ESTADO
nuevoPedido.estado = 'pendiente';

// FECHA
nuevoPedido.fecha = new Date().toLocaleDateString();

// ID CLIENTE
const cliente = clientes.find((c)=>c.id === nuevoPedido.idCliente);
if(!cliente){
        const error = new Error('Cliente no encontrado');
        error.status = 404;
        throw error;
};

// ID PRODUCTO
const producto = productos.find((p)=>p.id === nuevoPedido.idProducto);
if(!producto){
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
};
// CANTIDAD
if(typeof nuevoPedido.cantidad !== "number" || nuevoPedido.cantidad < 0 || nuevoPedido.cantidad > producto.stock){
        const error = new Error('Cantidad invalida, ingrese la cantidad');
        error.status = 400;
        throw error;
};
// DESCUENTA STOCK
producto.stock -= nuevoPedido.cantidad;
// TOTAL
nuevoPedido.total = nuevoPedido.cantidad * producto.precio;

// ID
const maxId = pedidos.reduce((max, p)=> {return p.id > max ? p.id : max}, 0);
nuevoPedido.id = maxId + 1;

await guardarProducto(productos);

pedidos.push(nuevoPedido);
await guardarPedido(pedidos);

return nuevoPedido;
}

// cancelar (devuelve stock)
async function cancelarPedido(id){
    const pedidos = await leerPedidos();
    const productos = await leerProductos();

    const pedidoCancelado = pedidos.findIndex((p)=>{return p.id === id});

    if(pedidoCancelado === -1){
        const error = new Error('Id invalido');
        error.status = 404;
        throw error;
    };


    const productoActualizado = productos.find((p)=>{return p.id === pedidos[pedidoCancelado].idProducto});

    if(!productoActualizado){
        const error = new Error('Producto no encontrado');
        error.status = 404;
        throw error;
    };

    productoActualizado.stock += pedidos[pedidoCancelado].cantidad;
    pedidos[pedidoCancelado].estado = "cancelado";

    await guardarPedido(pedidos);
    await guardarProducto(productos);
    return pedidos[pedidoCancelado];
}

// completar
async function pedidoRealizado(id){
    const pedidos = await leerPedidos();
    const pedidoCompletado = pedidos.find((p)=>{return p.id === id});

    if(!pedidoCompletado){
        const error = new Error('No se ha encontrado el pedido');
        error.status = 404;
        throw error;
    };

    pedidoCompletado.estado = "completado";


    await guardarPedido(pedidos);
    return pedidoCompletado;
}

// filtrar por estado
async function filtrarPedidos(estado){
    const pedidos = await leerPedidos();

    const pedidoEstado = pedidos.filter((p)=>{return p.estado === estado});
    if(pedidoEstado.length === 0){
        const error = new Error('No se ha encontrado pedidos con ese estado');
        error.status = 404;
        throw error;
    }
return pedidoEstado;
}


module.exports = {
    leerPedidos,
    guardarPedido,
    crearPedido,
    cancelarPedido,
    pedidoRealizado,
    filtrarPedidos
}