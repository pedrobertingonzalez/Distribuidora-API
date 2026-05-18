

const fs = require ('fs').promises;
const path = require ('path');

const rutaProductos = path.join(__dirname, '..', 'data', 'productos.json');

const {
    leerProveedores
} = require ('./proveedores.services');



async function leerProductos(){
    const productos = await fs.readFile(rutaProductos, 'utf-8');
    return JSON.parse(productos);
}

async function guardarProducto(nuevoProducto){
    const productoEnTexto = JSON.stringify(nuevoProducto, null, 2);
    await fs.writeFile(rutaProductos, productoEnTexto);
}

async function crearProducto(nuevoProducto){
    const productos = await leerProductos();
    const proveedores = await leerProveedores();

    if(!nuevoProducto.nombre){
        const error = new Error('Falta el nombre del producto');
        error.status = 400;
        throw error;
    }

    if(typeof nuevoProducto.precio !== "number" || nuevoProducto.precio < 0){
        const error = new Error('Precio invalido');
        error.status = 400;
        throw error;
    }

    if(typeof nuevoProducto.stock !== "number" || nuevoProducto.stock <= 0){
        const error = new Error('Stock invalido');
        error.status = 400;
        throw error;
    }

    const proveedor = proveedores.find((p)=>{return p.id === nuevoProducto.idProveedor});

    if(!proveedor){
        const error = new Error('No se ha encontrado el proveedor');
        error.status = 400;
        throw error;
    }


    const maxId = productos.reduce((max, p)=> {return p.id > max ? p.id : max}, 0);
    nuevoProducto.id = maxId + 1;

    productos.push(nuevoProducto);
    await guardarProducto(productos);
    return nuevoProducto;

}

async function productosPorProveedor(idProveedor){
    const productos = await leerProductos();

    const productosProveedor = productos.filter((p)=> p.idProveedor === idProveedor);
    
    if(productosProveedor.length === 0){
        const error = new Error('No hay productos para ese proveedor');
        error.status = 404;
        throw error;
    }
return productosProveedor;
}

async function stockBajo(){
    const productos = await leerProductos();
    const productosBajos = productos.filter ((p)=> p.stock < 10);
    if(productosBajos.length === 0){
        const error = new Error('No hay productos con menos de 10 unidades');
        error.status = 404;
        throw error;
    }
return productosBajos;
}

module.exports = {
    leerProductos,
    guardarProducto,
    crearProducto,
    productosPorProveedor,
    stockBajo
}