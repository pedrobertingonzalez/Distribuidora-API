const tools = [
    {
        name: "obtenerProductosStockBajo",
        description: "Retorna los productos cuyo stock actual este debajo de 50 unidades",
        input_schema: {
            type: "object",
            properties: {},
            required: []
    }
},
{
        name: "registrarPedidoPrueba",
        description: "crea un pedido para un determinado producto",
        input_schema: {
            type: "object",
            properties: {
                idCliente: {
                type: "number",
                description: "id del cliente que realiza el pedido"
                },
                idProducto: {
                    type: "number",
                    description: "id del producto a pedir"
                },
                cantidad: {
                    type: "number",
                    description: "cantidad a pedir"
                }
            },
            required: ["idCliente", "idProducto", "cantidad"]
        }
    },
    {
        name: "obtenerProveedores",
        description: "Retorna todos los proveedores",
        input_schema: {
        type: "object",
        properties: {},
        required: []
    }
}
]

module.exports = {tools}