import express from 'express';
import { matchRouter } from './matches/matchRoutes';
import { summonerRouter } from './summoners/summonerRoutes';

const app = express();
app.use(express.json());
app.use('/summoners', summonerRouter);
app.use('/match', matchRouter);

const PORT = 3000;
let server;
try {
    server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
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
