const express = require('express');
const summonerRoutes = require('./routes/summonerRoutes');

const app = express();
app.use(express.json());
app.use('/summoners', summonerRoutes);

const PORT = 3000;

// Start the server and store the server instance
let server;

try {
    server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} catch (error) {
    console.error('Error starting server: ', error);
    process.exit(1);
}

// Graceful shutdown logic
const shutdown = () => {
    console.log('Shutting down server...');
    if (server) {
        server.close(() => {
            console.log('Server closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
