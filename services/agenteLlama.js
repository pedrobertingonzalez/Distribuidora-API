const { ollamaClient } = require('./axiosClient');
const { leerProveedores } = require('./proveedores.services');

const consultarOllama = async (mensajeUsuario) => {
    const proveedores = await leerProveedores();

    const respuesta = await ollamaClient.post('/api/chat', {
        model: 'llama3.1:8b',
        messages: [
            {
                role: 'system',
                content: `Sos un asistente de una distribuidora. Estos son los proveedores registrados: ${JSON.stringify(proveedores)}`,
            },
            { role: 'user', content: mensajeUsuario },
        ],
        stream: false,
    });

    return respuesta.data.message.content;
};

module.exports = { consultarOllama };
