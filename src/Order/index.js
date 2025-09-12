// app.js
const fastify = require('fastify')({ logger: true });
const path = require('path');

let apiConfig = {
    apiBaseUrl: null,
    apiToken: null,
};

let fetchedResults = []; // store processed results in memory

// Serve static files
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public'),
});

// Root page
fastify.get('/', (req, reply) => {
    reply.sendFile('index.html');
});

fastify.get('/webhook', (req, reply) => {
    reply.sendFile('webhook.html');
});

fastify.get('/order-xml', (req, reply) => {
    reply.sendFile('xml-conversion.html');
});

// Save API config (URL + Token)
fastify.post('/set-config', async (request, reply) => {
    const { apiUrl, apiToken } = request.body;

    if (!apiUrl || !apiToken) {
        reply.code(400);
        return { success: false, error: 'Missing apiUrl or apiToken' };
    }

    apiConfig.apiBaseUrl = apiUrl;
    apiConfig.apiToken = apiToken;

    fastify.log.info(`🔗 Config set: ${apiUrl} | 🔑 Token: ${apiToken}`);
    return { success: true, config: apiConfig };
});

// Webhook endpoint
fastify.post('/webhook', async (request, reply) => {
    const payload = request.body;

    if (!payload || !payload.resourceId) {
        reply.code(400);
        return { success: false, error: 'Invalid payload' };
    }

    if (!apiConfig.apiBaseUrl || !apiConfig.apiToken) {
        reply.code(500);
        return { success: false, error: 'API config not set' };
    }

    try {
        const apiUrl = `${apiConfig.apiBaseUrl}/${payload.resourceId}`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiConfig.apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch resource: ${response.statusText}`);
        }

        const resourceData = await response.json();

        const newResult = {
            id: payload.resourceId,
            receivedAt: new Date().toISOString(),
            data: resourceData,
        };

        const existingIndex = fetchedResults.findIndex(item => item.id === payload.resourceId);

        if (existingIndex !== -1) {
            // Update existing result
            fetchedResults[existingIndex] = newResult;
            fastify.log.info(`🔄 Updated resource: ${payload.resourceId}`);
        } else {
            // Add new result to the beginning of the array
            fetchedResults.unshift(newResult);
            fastify.log.info(`✨ New resource added: ${payload.resourceId}`);
        }

        return { success: true, received: payload, fetched: resourceData };
    } catch (err) {
        fastify.log.error(err);
        reply.code(500);
        return { success: false, error: err.message };
    }
});

// Get stored results (for frontend table)
fastify.get('/get-data', async (req, reply) => {
    return { success: true, results: fetchedResults };
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Server running at http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
