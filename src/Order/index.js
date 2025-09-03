// app.js
const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register fastify-static to serve files from the 'public' directory
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public'),
});

// Serve the index.html file for the root route
fastify.get('/', (req, reply) => {
    reply.sendFile('index.html');
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: 3000 });
        console.log('🚀 Server running at http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
