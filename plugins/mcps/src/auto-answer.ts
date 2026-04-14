#!/usr/bin/env node
/**
 * Auto-Answer Server
 *
 * Usage:
 *   npx tsx auto-answer.ts           # Start in background (default)
 *   npx tsx auto-answer.ts --start   # Start in background
 *   npx tsx auto-answer.ts --stop    # Stop the running server
 *   npx tsx auto-answer.ts --status  # Check if running
 *   npx tsx auto-answer.ts --foreground     # Run in foreground (keep terminal)
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';
import Database from 'better-sqlite3';
import {getLogger} from '../../src/libs/logger';

const DEFAULT_PORT = 17346;
const CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR || process.cwd();
const DATA_DIR = path.join(CONFIG_DIR, '.auto-answer');
const DB_DIR = path.join(DATA_DIR, 'database');
const DB_PATH = path.join(DB_DIR, 'auto-answer.db');
const PID_FILE = path.join(DB_DIR, 'server.pid');
const SCHEMA_PATH = path.join(CONFIG_DIR, '.auto-answer', 'sql', 'schema.sql');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Question {
    id: string;
    group_id: string;
    source_id: string;
    content: string;
    options: string;
    multiple: number;
    created_at: string;
    answer: string | null;
    answered_at: string | null;
}

// Parse command line args
const args = process.argv.slice(2);
let command = 'start';
let port = DEFAULT_PORT;

for (const arg of args) {
    if (arg === '--start') command = 'start';
    else if (arg === '--stop') command = 'stop';
    else if (arg === '--status') command = 'status';
    else if (arg === '--foreground') command = 'foreground';
    else if (arg === '--port' && args[args.indexOf(arg) + 1]) {
        port = parseInt(args[args.indexOf(arg) + 1], 10);
    }
}

// Ensure directories exist
function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive: true});
    }
}

// UUID validation
function isValidUUID(id: string): boolean {
    return UUID_REGEX.test(id);
}

// Database initialization
function initDatabase(): void {
    ensureDir(DB_DIR);

    if (!fs.existsSync(SCHEMA_PATH)) {
        throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
    }

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const db = new Database(DB_PATH);
    db.exec(schema);
    db.close();
}

// Get database connection
function getDb(): Database.Database {
    return new Database(DB_PATH);
}

// Parse JSON body
function parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
}

// Check if server is running
async function isRunningSync(): Promise<boolean> {
    return new Promise(resolve => {
        const net = require('net');
        const client = new net.Socket();
        client.connect(port, '127.0.0.1', () => {
            client.destroy();
            resolve(true);
        });
        client.on('error', () => {
            client.destroy();
            resolve(false);
        });
        client.setTimeout(1000, () => {
            client.destroy();
            resolve(false);
        });
    });
}

// Get PID of running server
function getRunningPid(): number | null {
    if (!fs.existsSync(PID_FILE)) return null;
    try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
        process.kill(pid, 0);
        return pid;
    } catch {
        try {
            fs.unlinkSync(PID_FILE);
        } catch { /* ignore */
        }
        return null;
    }
}

// Save PID
function savePid(pid: number): void {
    fs.writeFileSync(PID_FILE, String(pid));
}

// Create HTTP server
function createServer(): http.Server {
    return http.createServer(async (req, res) => {
        const url = req.url || '';
        const method = req.method;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
            return res.end();
        }

        try {
            // GET /api/questions
            if (method === 'GET' && url.startsWith('/api/questions')) {
                const db = getDb();

                // Parse query parameters
                const urlObj = new URL(req.url || '', `http://localhost:${port}`);
                const sourceId = urlObj.searchParams.get('source_id');
                const includeAnswered = urlObj.searchParams.get('include_answered') === 'true';

                let query = 'SELECT * FROM questions';
                const params: string[] = [];

                // Filter by source_id if provided
                if (sourceId) {
                    if (!isValidUUID(sourceId)) {
                        db.close();
                        return sendJson(res, 400, {error: 'Invalid source_id format'});
                    }
                    query += ' WHERE source_id = ?';
                    params.push(sourceId);
                }

                let questions = db.prepare(query).all(...params) as Question[];

                // Filter out answered questions unless include_answered is true
                // Note: answer is NULL in DB, but better-sqlite3 may return undefined
                if (!includeAnswered) {
                    questions = questions.filter(q => !q.answer);
                }

                const result = questions.map(q => ({
                    ...q,
                    options: JSON.parse(q.options)
                }));

                db.close();
                sendJson(res, 200, {questions: result});
                return;
            }

            // POST /api/questions
            if (method === 'POST' && url === '/api/questions') {
                const body = await parseBody(req) as { questions: unknown[] };
                const questions = body.questions;

                if (!questions || !Array.isArray(questions)) {
                    return sendJson(res, 400, {error: 'Missing questions array'});
                }

                for (const q of questions) {
                    const question = q as Record<string, unknown>;
                    const groupId = question.group_id as string;
                    const sourceId = question.source_id as string;
                    const content = question.content as string;
                    const options = question.options as unknown[];

                    if (!groupId || !isValidUUID(groupId)) {
                        return sendJson(res, 400, {error: 'Invalid group_id'});
                    }
                    if (!sourceId || !isValidUUID(sourceId)) {
                        return sendJson(res, 400, {error: 'Invalid source_id'});
                    }
                    if (!content || !options || !Array.isArray(options)) {
                        return sendJson(res, 400, {error: 'Invalid content or options'});
                    }
                    for (const opt of options as { text: string }[]) {
                        if (!opt.text) {
                            return sendJson(res, 400, {error: 'Option missing text'});
                        }
                    }
                }

                const db = getDb();
                const stmt = db.prepare(`
                    INSERT INTO questions (id, group_id, source_id, content, options, multiple, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                for (const q of questions) {
                    const question = q as Record<string, unknown>;
                    stmt.run(
                        crypto.randomUUID(),
                        question.group_id,
                        question.source_id,
                        question.content,
                        JSON.stringify(question.options),
                        question.multiple ? 1 : 0,
                        new Date().toISOString()
                    );
                }

                db.close();
                sendJson(res, 200, {success: true, count: questions.length});
                return;
            }

            // POST /api/answers
            if (method === 'POST' && url === '/api/answers') {
                const body = await parseBody(req) as { answers: unknown[] };
                const answers = body.answers;

                if (!answers || !Array.isArray(answers)) {
                    return sendJson(res, 400, {error: 'Missing answers array'});
                }

                // Basic validation
                for (const a of answers) {
                    const answer = a as Record<string, unknown>;
                    if (!answer.group_id || !isValidUUID(answer.group_id as string)) {
                        return sendJson(res, 400, {error: 'Invalid group_id'});
                    }
                    if (!answer.source_id || !isValidUUID(answer.source_id as string)) {
                        return sendJson(res, 400, {error: 'Invalid source_id'});
                    }
                    if (!answer.questionId) {
                        return sendJson(res, 400, {error: 'Missing questionId'});
                    }
                    // Answer length limit: 100 chars
                    const answerText = answer.answer as string || '';
                    if (answerText.length > 100) {
                        return sendJson(res, 400, {error: 'Answer exceeds 100 characters'});
                    }
                }

                const db = getDb();

                // Check if any question already has an answer
                for (const a of answers) {
                    const answer = a as Record<string, unknown>;
                    const questionId = answer.questionId as string;
                    const existing = db.prepare('SELECT answer FROM questions WHERE id = ?').get(questionId) as {
                        answer: string | null
                    } | undefined;
                    if (existing && existing.answer !== null) {
                        db.close();
                        return sendJson(res, 400, {error: `Question ${questionId} has already been answered`});
                    }
                }

                // Validate: must answer ALL questions in the group
                const groupId = (answers[0] as Record<string, unknown>).group_id as string;
                const sourceId = (answers[0] as Record<string, unknown>).source_id as string;

                const allQuestionsInGroup = db.prepare(
                    'SELECT id FROM questions WHERE group_id = ? AND source_id = ?'
                ).all(groupId, sourceId) as { id: string }[];

                const answeredQuestionIds = new Set((answers as Record<string, unknown>[]).map(a => a.questionId as string));

                for (const q of allQuestionsInGroup) {
                    if (!answeredQuestionIds.has(q.id)) {
                        db.close();
                        return sendJson(res, 400, {error: `Must answer all questions in the group. Missing question: ${q.id}`});
                    }
                }

                // Update questions with answers
                const now = new Date().toISOString();
                const updateStmt = db.prepare(`
                    UPDATE questions
                    SET answer      = ?,
                        answered_at = ?
                    WHERE id = ?
                `);

                for (const a of answers) {
                    const answer = a as Record<string, unknown>;
                    updateStmt.run(
                        answer.answer as string || '',
                        now,
                        answer.questionId
                    );
                }

                db.close();
                sendJson(res, 200, {success: true, count: answers.length});
                return;
            }

            // POST /api/clean
            if (method === 'POST' && url === '/api/clean') {
                const db = getDb();

                // Delete questions without group_id
                const result = db.prepare(`
                    DELETE
                    FROM questions
                    WHERE group_id IS NULL
                       OR group_id = ''
                `).run();

                db.close();
                sendJson(res, 200, {success: true, deleted: result.changes});
                return;
            }

            sendJson(res, 404, {error: 'Not found'});
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            sendJson(res, 500, {error: message});
        }
    });
}

// Commands
async function startServer(foreground = false): Promise<void> {
    if (await isRunningSync()) {
        getLogger().info(`Server is already running on port ${port}`);
        return;
    }

    initDatabase();
    getLogger().info('Database initialized');

    const server = createServer();

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            getLogger().error(`Port ${port} is already in use`);
            process.exit(1);
        }
        getLogger().error('Server error:', err);
        process.exit(1);
    });

    server.listen(port, () => {
        getLogger().info(`AutoAnswer Server started at http://localhost:${port}`);
        if (!foreground) {
            getLogger().info('Server is running in background');
            getLogger().info('Use "npx tsx auto-answer.ts --stop" to stop');
        }
    });

    savePid(process.pid);

    process.on('SIGINT', () => {
        getLogger().info('\nShutting down...');
        server.close(() => {
            try {
                fs.unlinkSync(PID_FILE);
            } catch { /* ignore */
            }
            getLogger().info('Server stopped');
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        server.close(() => {
            try {
                fs.unlinkSync(PID_FILE);
            } catch { /* ignore */
            }
            process.exit(0);
        });
    });
}

function stopServer(): void {
    const pid = getRunningPid();
    if (pid) {
        try {
            process.kill(pid, 'SIGTERM');
            getLogger().info(`Server (PID ${pid}) stopped`);
            setTimeout(() => {
                try {
                    fs.unlinkSync(PID_FILE);
                } catch { /* ignore */
                }
            }, 1000);
        } catch (err) {
            getLogger().info('Failed to stop server:', (err as Error).message);
            try {
                fs.unlinkSync(PID_FILE);
            } catch { /* ignore */
            }
        }
    } else {
        if (process.platform === 'win32') {
            try {
                execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`, {stdio: 'ignore'});
                getLogger().info(`Server on port ${port} stopped`);
            } catch {
                getLogger().info('No server running');
            }
        } else {
            getLogger().info('No server running');
        }
    }
}

async function checkStatus(): Promise<void> {
    if (await isRunningSync()) {
        getLogger().info(`Server is running on port ${port}`);
    } else {
        getLogger().info('Server is not running');
    }
}

// Execute command
switch (command) {
    case 'start':
    case 'foreground':
        startServer(command === 'foreground');
        break;
    case 'stop':
        stopServer();
        break;
    case 'status':
        checkStatus();
        break;
}
