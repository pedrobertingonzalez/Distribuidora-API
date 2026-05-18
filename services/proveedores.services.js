

const fs = require ('fs').promises;
const path = require ('path');

const rutaProveedores = path.join(__dirname, '..', 'data', 'proveedores.json');


async function leerProveedores(){
    const proveedores = await fs.readFile(rutaProveedores, 'utf-8');
    return JSON.parse(proveedores);
}

async function guardarProveedores(nuevoProveedor){
    const proveedorEnTexto = JSON.stringify(nuevoProveedor, null, 2);
    await fs.writeFile(rutaProveedores, proveedorEnTexto);
}


async function crearProveedor(nuevoProveedor){
 const proveedores = await leerProveedores();

//  NOMBRE
if(!nuevoProveedor.nombre){
    const error = new Error('Falta el nombre');
    error.status = 400;
    throw error;
}

// EMAIL
if(!nuevoProveedor.email){
    const error = new Error('Falta el email');
    error.status = 400;
    throw error;
}

// TELEFONO
if(typeof nuevoProveedor.telefono !== "number"){
    const error = new Error('Agregue un telefono valido');
    error.status = 400;
    throw error;
}

// DIRECCION
if(!nuevoProveedor.direccion){
    const error = new Error('Falta la direccion');
    error.status = 400;
    throw error;
}

const maxId= proveedores.reduce((max, c)=>{return c.id > max ? c.id : max}, 0);
nuevoProveedor.id = maxId + 1;

proveedores.push(nuevoProveedor);
await guardarProveedores(proveedores);
return nuevoProveedor;
}



async function eliminarProveedor(id){
    const proveedores = await leerProveedores();
    const proveedoresActualizados = proveedores.filter((c)=> {return c.id !== id});

    if(proveedoresActualizados.length === proveedores.length){
        const error = new Error ('Proveedor no encontrado');
        error.status = 404;
        throw error;
    }

    await guardarProveedores(proveedoresActualizados);
    return proveedoresActualizados;
}



module.exports = {
    leerProveedores,
    crearProveedor,
    eliminarProveedor
}