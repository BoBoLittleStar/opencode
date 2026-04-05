import http from 'http';
import type {Plugin} from "@opencode-ai/plugin";
import {createServer} from './server';
import {postQuestions} from './client';
import {createLogger} from '../util';

export const AutoAnswer: Plugin = async () => {
    const PORT = 17345;

    function startServer(): Promise<void> {
        return new Promise((resolve) => {
            logger.info("new promise");
            const testServer = http.createServer();
            testServer.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    logger.info(`AutoAnswer Server already running on port ${PORT}, skipping start`);
                    resolve();
                } else {
                    logger.error(`AutoAnswer Server error: ${err.message}`);
                    resolve();
                }
            });
            testServer.once('listening', () => {
                logger.info('listening');
                testServer.close(() => {
                    logger.info('close');
                    let server = createServer();
                    server.on('error', (err: NodeJS.ErrnoException) => {
                        if (err.code === 'EADDRINUSE') {
                            logger.info(`AutoAnswer Server already running on port ${PORT}`);
                        } else {
                            logger.error(`AutoAnswer Server error: ${err.message}`);
                        }
                    });
                    server.listen(PORT, () => {
                        logger.info(`AutoAnswer Server started at http://localhost:${PORT}`);
                        resolve();
                    });
                });
            });
            logger.info('listen');
            testServer.listen(PORT);
        });
    }

    const logger = createLogger();
    await startServer();

    return {
        'tool.execute.before': async (input, output: { args: unknown }) => {
            if (input.tool === 'question') {
                logger.info(`Agent is asking a question.`);
                const args = output.args as {
                    questions?: Array<{
                        header: string;
                        question: string;
                        options: Array<{ label: string; description?: string }>;
                        multiple?: boolean
                    }>
                };
                if (args.questions && Array.isArray(args.questions)) {
                    const questions = args.questions.map(q => ({
                        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        content: q.question,
                        options: q.options.map(opt => ({
                            text: opt.label,
                            description: opt.description || ''
                        })),
                        multiple: q.multiple || false,
                        createdAt: new Date().toISOString()
                    }));
                    let messageSent = false;
                    await postQuestions(questions).then(() => messageSent = true).catch(err => {
                        logger.error(`Failed to post questions: ${err.message}`);
                    });
                    if (messageSent) {
                        throw new Error('问题已发送，请等待回应');
                    }
                }
            }
        }
    };
};
