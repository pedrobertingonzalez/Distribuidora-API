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
                cliente: {
                type: "string",
                description: "ObjectId (24 caracteres hex) del cliente que realiza el pedido"
                },
                producto: {
                    type: "string",
                    description: "ObjectId (24 caracteres hex) del producto a pedir"
                },
                cantidad: {
                    type: "number",
                    description: "cantidad a pedir"
                }
            },
            required: ["cliente", "producto", "cantidad"]
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