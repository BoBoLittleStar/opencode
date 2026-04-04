import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {Plugin} from "@opencode-ai/plugin";
import {createServer} from './server';
import {postQuestions} from './client';
import {createLogger} from '../util';

// 使用当前工作目录
const CWD = process.cwd();
const DATA_DIR = path.join(CWD, '.auto-answer');

const PORT = 17345;  // 不常用端口
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

let server: http.Server | null = null;
let serverRunning = false;
const logger = createLogger();

// 当前实例的session ID
let currentSessionId: string | null = null;

interface SessionInfo {
    id: string;
    pid: number;
    startedAt: string;
}

function readSessions(): SessionInfo[] {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch {
        // ignore
    }
    return [];
}

function writeSessions(sessions: SessionInfo[]): void {
    const dataDir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {recursive: true});
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

function registerSession(): string {
    const sessions = readSessions();
    const pid = process.pid;
    const sessionId = `session_${pid}_${Date.now()}`;
    const sessionInfo: SessionInfo = {
        id: sessionId,
        pid: pid,
        startedAt: new Date().toISOString()
    };
    sessions.push(sessionInfo);
    writeSessions(sessions);
    currentSessionId = sessionId;
    logger.info(`Session registered: ${sessionId} (total: ${sessions.length})`);
    return sessionId;
}

function unregisterSession(): void {
    if (!currentSessionId) return;

    const sessions = readSessions();
    const beforeCount = sessions.length;
    const filtered = sessions.filter(s => s.id !== currentSessionId);

    if (filtered.length < beforeCount) {
        writeSessions(filtered);
        logger.info(`Session unregistered: ${currentSessionId} (remaining: ${filtered.length})`);
    }
    currentSessionId = null;
}

function getActiveSessionCount(): number {
    return readSessions().length;
}

// 清理孤立的session（PID不存在）
function cleanupOrphanedSessions(): number {
    const sessions = readSessions();
    const validSessions: SessionInfo[] = [];
    let cleaned = 0;

    for (const session of sessions) {
        try {
            // 检查进程是否存活
            process.kill(session.pid, 0);
            validSessions.push(session);
        } catch {
            // 进程不存在，清理
            cleaned++;
        }
    }

    if (cleaned > 0) {
        writeSessions(validSessions);
        logger.info(`Cleaned up ${cleaned} orphaned session(s)`);
    }

    return validSessions.length;
}

function startServer(): Promise<void> {
    return new Promise((resolve) => {
        // 先清理孤立的session
        cleanupOrphanedSessions();

        // 如果端口已被占用，说明服务已在运行
        const testServer = http.createServer();
        testServer.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                logger.info(`AutoAnswer Server already running on port ${PORT}, skipping start`);
                serverRunning = false;
                resolve();
            } else {
                logger.error(`AutoAnswer Server error: ${err.message}`);
                resolve();
            }
        });
        testServer.once('listening', () => {
            testServer.close(() => {
                // 端口可用，开始创建实际服务
                server = createServer();
                server.on('error', (err: NodeJS.ErrnoException) => {
                    if (err.code === 'EADDRINUSE') {
                        logger.info(`AutoAnswer Server already running on port ${PORT}`);
                        serverRunning = false;
                    } else {
                        logger.error(`AutoAnswer Server error: ${err.message}`);
                    }
                });
                server.listen(PORT, () => {
                    serverRunning = true;
                    logger.info(`AutoAnswer Server started at http://localhost:${PORT}`);
                    resolve();
                });
            });
        });
        testServer.listen(PORT);
    });
}

function stopServer(): void {
    if (server && serverRunning) {
        server.closeAllConnections();
        server.unref();
        server.close();
        server = null;
        serverRunning = false;
        logger.info('AutoAnswer Server stopped');
    }
}

export const AutoAnswer: Plugin = async () => {
    // 注册当前session
    registerSession();

    await startServer();

    return {
        event: async ({event}) => {
            if (event.type === 'server.instance.disposed') {
                // 注销当前session
                unregisterSession();

                // 只有当所有session都退出时才关闭服务
                const activeCount = getActiveSessionCount();
                if (activeCount === 0) {
                    stopServer();
                } else {
                    logger.info(`AutoAnswer Server kept running (${activeCount} session(s) still active)`);
                }
            }
        },
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
                    // 发送到服务器（异步，不等待）
                    postQuestions(questions).catch(err => {
                        logger.error(`Failed to post questions: ${err.message}`);
                    });
                    // 抛出错误，阻止工具继续执行
                    throw new Error('问题已发送，请等待回应');
                }
            }
        }
    };
};
