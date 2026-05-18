

const fs = require ('fs').promises;
const path = require ('path');

const rutaClientes = path.join(__dirname, '..', 'data', 'clientes.json');


async function leerClientes(){
    const clientes = await fs.readFile(rutaClientes, 'utf-8');
    return JSON.parse(clientes);
}

async function guardarClientes(nuevoCliente){
    const clienteEnTexto = JSON.stringify(nuevoCliente, null, 2);
    await fs.writeFile(rutaClientes, clienteEnTexto);
}


async function crearCliente(nuevoCliente){
 const clientes = await leerClientes();

//  NOMBRE
if(!nuevoCliente.nombre){
    const error = new Error('Falta el nombre');
    error.status = 400;
    throw error;
}

// EMAIL
if(!nuevoCliente.email){
    const error = new Error('Falta el email');
    error.status = 400;
    throw error;
}

// TELEFONO
if(typeof nuevoCliente.telefono !== "number"){
    const error = new Error('Agregue un telefono valido');
    error.status = 400;
    throw error;
}

// DIRECCION
if(!nuevoCliente.direccion){
    const error = new Error('Falta la direccion');
    error.status = 400;
    throw error;
}

const maxId= clientes.reduce((max, c)=>{return c.id > max ? c.id : max}, 0);
nuevoCliente.id = maxId + 1;

clientes.push(nuevoCliente);
await guardarClientes(clientes);
return nuevoCliente;
}



async function eliminarCliente(id){
    const clientes = await leerClientes();
    const clientesActualizados = clientes.filter((c)=> {return c.id !== id});

    if(clientesActualizados.length === clientes.length){
        const error = new Error ('Cliente no encontrado');
        error.status = 404;
        throw error;
    }

    await guardarClientes(clientesActualizados);
    return clientesActualizados;
}

module.exports = {
    leerClientes,
    crearCliente,
    eliminarCliente
}
