require('dotenv').config();
const { anthropicClient } = require('./axiosClient');
const { tools } = require('./tools');
const { stockBajo } = require('./productos.services');
const { crearPedido } = require('./pedidos.services');
const { leerProveedores } = require('./proveedores.services');

const consultarAgente = async (mensajeUsuario) => {
    let messages = [{ role: 'user', content: mensajeUsuario }];
    let stopReason = 'tool_use';
    let iteraciones = 0;
    let respuesta;

    while (stopReason !== 'end_turn' && iteraciones < 10) {
        respuesta = await anthropicClient.post('/messages', {
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            tools: tools,
            messages: messages,
        });

        stopReason = respuesta.data.stop_reason;

        if (stopReason === 'tool_use') {
            const toolUse = respuesta.data.content.find((b) => b.type === 'tool_use');

            let resultado;
            if (toolUse.name === 'obtenerProductosStockBajo') {
                resultado = await stockBajo();
            } else if (toolUse.name === 'crearPedido') {
                resultado = await crearPedido(toolUse.input);
            } else if (toolUse.name === 'obtenerProveedores') {
                resultado = await leerProveedores();
            }

            messages.push({ role: 'assistant', content: respuesta.data.content });
            messages.push({
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(resultado) }],
            });
        }

        iteraciones++;
    }

    return respuesta.data.content[0].text;
};

module.exports = { consultarAgente };
