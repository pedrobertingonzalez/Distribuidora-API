const axios = require('axios');

const anthropicClient = axios.create({
    baseURL: 'https://api.anthropic.com/v1',
    timeout: 30000,
    headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
    },
});

anthropicClient.interceptors.request.use((config) => {
    config.headers['x-api-key'] = process.env.ANTHROPIC_API_KEY;
    config.metadata = { startTime: Date.now() };
    return config;
});

anthropicClient.interceptors.response.use(
    (response) => {
        const ms = Date.now() - response.config.metadata.startTime;
        console.log(`[IA] ${response.config.method?.toUpperCase()} ${response.config.url} — ${ms}ms`);
        return response;
    },
    (error) => {
        const ms = error.config?.metadata ? Date.now() - error.config.metadata.startTime : '?';
        console.error(`[IA] Error en llamada a Anthropic (${ms}ms):`, error.message);
        return Promise.reject(error);
    }
);

const ollamaClient = axios.create({
    baseURL: 'http://localhost:11434',
    timeout: 60000,
    headers: { 'content-type': 'application/json' },
});

module.exports = { anthropicClient, ollamaClient };
