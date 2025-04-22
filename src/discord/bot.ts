import express from 'express';
import './matchMonitoringService';

const app = express();
app.use(express.json());
const PORT = 3001;
let server;
try {
    server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        if (process.env.USE_RIOT_API === 'true') {
            if (process.env.RIOT_API_KEY) {
                console.log('Using Riot API');
            }
        } else {
            console.log('Using Mock API');
        }
    });
} catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
}

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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
