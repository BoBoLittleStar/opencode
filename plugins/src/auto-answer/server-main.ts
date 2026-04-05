import {initDatabase} from './storage';
import {createServer} from './server';
import {getLogger} from '../util';

const PORT = 17345;

async function main(): Promise<void> {
    const logger = getLogger();

    // Initialize database first
    logger.info('Initializing database...');
    initDatabase();
    logger.info('Database initialized.');

    // Create and start the server
    const server = createServer();

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use. Is the server already running?`);
            process.exit(1);
        } else {
            logger.error(`Server error: ${err.message}`);
            process.exit(1);
        }
    });

    server.listen(PORT, () => {
        logger.info(`AutoAnswer Server started at http://localhost:${PORT}`);
    });
}

main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
