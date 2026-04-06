#!/usr/bin/env node
/**
 * Auto-Answer Server Launcher
 * 
 * Usage:
 *   node server-launcher.js           # Start in background (default)
 *   node server-launcher.js --start   # Start in background
 *   node server-launcher.js --stop    # Stop the running server
 *   node server-server-launcher.js --status  # Check if running
 *   node server-launcher.js --install        # Install as auto-start (Windows)
 *   node server-launcher.js --uninstall      # Remove auto-start
 *   node server-launcher.js --foreground     # Run in foreground (keep terminal)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

const DEFAULT_PORT = 17346;
const CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR || process.cwd();
const DATA_DIR = path.join(CONFIG_DIR, '.auto-answer');
const DB_DIR = path.join(DATA_DIR, 'database');
const PID_FILE = path.join(DB_DIR, 'server.pid');
const LOG_FILE = path.join(DB_DIR, 'server.log');

const args = process.argv.slice(2);
let command = 'start';

for (const arg of args) {
    if (arg === '--start') command = 'start';
    else if (arg === '--stop') command = 'stop';
    else if (arg === '--status') command = 'status';
    else if (arg === '--install') command = 'install';
    else if (arg === '--uninstall') command = 'uninstall';
    else if (arg === '--foreground') command = 'foreground';
}

// Ensure directories exist
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Get port from args or default
let port = DEFAULT_PORT;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
        port = parseInt(args[i + 1], 10);
        break;
    }
}

// Python script path
const PYTHON_SCRIPT = path.join(__dirname, 'dist', 'auto-answer', 'python', 'db.py');

// Helper function to run Python commands
function runPythonCommand(cmd, stdinData) {
    ensureDir(DB_DIR);
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = [pythonCmd, PYTHON_SCRIPT, cmd];
    const options = { encoding: 'utf-8' };
    if (stdinData !== undefined) {
        options.input = JSON.stringify(stdinData);
    }
    if (process.platform === 'win32') {
        args.push('2>NUL');
    }
    try {
        return execSync(args.join(' '), options);
    } catch (error) {
        throw new Error(error.stdout || error.stderr || String(error));
    }
}

function parseJsonOutput(output) {
    const trimmed = output.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
}

// Check if server is running
function isRunning() {
    return new Promise((resolve) => {
        try {
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/api/questions',
                method: 'GET',
                timeout: 2000
            }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        } catch {
            resolve(false);
        }
    });
}

// Check if server is running (sync version for startup check)
function isRunningSync() {
    const net = require('net');
    const client = new net.Socket();
    return new Promise((resolve) => {
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
function getRunningPid() {
    if (!fs.existsSync(PID_FILE)) return null;
    try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
        try {
            process.kill(pid, 0);
            return pid;
        } catch {
            fs.unlinkSync(PID_FILE);
            return null;
        }
    } catch {
        return null;
    }
}

// Save PID
function savePid(pid) {
    fs.writeFileSync(PID_FILE, String(pid));
}

// Create HTTP server (inline version for launcher)
function parseBody(req) {
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

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function createServer() {
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
                const output = runPythonCommand('get_questions');
                const questions = parseJsonOutput(output) || [];
                const questionsWithAnswers = questions.map(q => {
                    try {
                        const answerOutput = runPythonCommand('get_answer_by_question_id', { question_id: q.id });
                        const answer = parseJsonOutput(answerOutput);
                        return { ...q, ...(answer && { answer: answer.answer }) };
                    } catch {
                        return q;
                    }
                });
                sendJson(res, 200, { questions: questionsWithAnswers });
                return;
            }

            // POST /api/questions
            if (method === 'POST' && url === '/api/questions') {
                const body = await parseBody(req);
                const questions = body.questions;
                
                if (!questions || !Array.isArray(questions)) {
                    return sendJson(res, 400, { error: 'Missing questions array' });
                }

                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                
                for (const q of questions) {
                    if (!q.group_id || !uuidRegex.test(q.group_id)) {
                        return sendJson(res, 400, { error: 'Invalid group_id' });
                    }
                    if (!q.source_id || !uuidRegex.test(q.source_id)) {
                        return sendJson(res, 400, { error: 'Invalid source_id' });
                    }
                    if (!q.content || !q.options || !Array.isArray(q.options)) {
                        return sendJson(res, 400, { error: 'Invalid content or options' });
                    }
                    for (const opt of q.options) {
                        if (!opt.text) {
                            return sendJson(res, 400, { error: 'Option missing text' });
                        }
                    }
                }

                const data = questions.map(q => ({
                    group_id: q.group_id,
                    source_id: q.source_id,
                    content: q.content,
                    options: q.options,
                    multiple: q.multiple ? 1 : 0,
                    created_at: new Date().toISOString()
                }));

                runPythonCommand('add_questions', data);
                sendJson(res, 200, { success: true, count: data.length });
                return;
            }

            // POST /api/answers
            if (method === 'POST' && url === '/api/answers') {
                const body = await parseBody(req);
                const answers = body.answers;
                
                if (!answers || !Array.isArray(answers)) {
                    return sendJson(res, 400, { error: 'Missing answers array' });
                }

                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                
                for (const a of answers) {
                    if (!a.group_id || !uuidRegex.test(a.group_id)) {
                        return sendJson(res, 400, { error: 'Invalid group_id' });
                    }
                    if (!a.source_id || !uuidRegex.test(a.source_id)) {
                        return sendJson(res, 400, { error: 'Invalid source_id' });
                    }
                    if (!a.questionId) {
                        return sendJson(res, 400, { error: 'Missing questionId' });
                    }
                }

                const data = answers.map(a => ({
                    group_id: a.group_id,
                    question_id: a.questionId,
                    source_id: a.source_id,
                    answer: a.answer || '',
                    created_at: new Date().toISOString()
                }));

                runPythonCommand('add_answers', data);
                sendJson(res, 200, { success: true, count: data.length });
                return;
            }

            // POST /api/clean
            if (method === 'POST' && url === '/api/clean') {
                const output = runPythonCommand('clean_old_data');
                const result = parseJsonOutput(output);
                sendJson(res, 200, { success: true, deleted: result.deleted_questions || 0 });
                return;
            }

            sendJson(res, 404, { error: 'Not found' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            sendJson(res, 500, { error: message });
        }
    });
}

// Commands
async function startServer(foreground = false) {
    // Check if already running
    if (await isRunningSync()) {
        console.log(`Server is already running on port ${port}`);
        return;
    }

    // Initialize database
    try {
        runPythonCommand('init');
        console.log('Database initialized');
    } catch (err) {
        console.log('Database may already exist:', err.message);
    }

    const server = createServer();

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use`);
            process.exit(1);
        }
        console.error('Server error:', err);
        process.exit(1);
    });

    server.listen(port, () => {
        console.log(`AutoAnswer Server started at http://localhost:${port}`);
        if (!foreground) {
            console.log('Server is running in background');
            console.log('Use "node server-launcher.js --stop" to stop');
        }
    });

    // Save PID
    savePid(process.pid);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        server.close(() => {
            if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
            console.log('Server stopped');
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        server.close(() => {
            if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
            process.exit(0);
        });
    });
}

function stopServer() {
    const pid = getRunningPid();
    if (pid) {
        try {
            process.kill(pid, 'SIGTERM');
            console.log(`Server (PID ${pid}) stopped`);
            setTimeout(() => {
                if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
            }, 1000);
        } catch (err) {
            console.log('Failed to stop server:', err.message);
            if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
        }
    } else {
        // Try to kill by port
        if (process.platform === 'win32') {
            try {
                execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
                console.log(`Server on port ${port} stopped`);
            } catch {
                console.log('No server running');
            }
        } else {
            console.log('No server running');
        }
    }
}

function checkStatus() {
    if (isRunningSync()) {
        console.log(`Server is running on port ${port}`);
    } else {
        console.log('Server is not running');
    }
}

function installAutoStart() {
    if (process.platform !== 'win32') {
        console.log('Auto-start is only supported on Windows');
        return;
    }

    const scriptPath = process.execPath;
    const launcherPath = __filename;
    
    try {
        // Create scheduled task
        const taskName = 'AutoAnswerServer';
        const cmd = `schtasks /create /tn "${taskName}" /tr "node \\"${launcherPath}\\"" /sc onlogon /delay 0000:30 /rl limited /f`;
        execSync(cmd, { stdio: 'ignore' });
        console.log('Auto-start installed! Server will start when you log in.');
    } catch (err) {
        console.log('Failed to install auto-start:', err.message);
    }
}

function uninstallAutoStart() {
    if (process.platform !== 'win32') {
        console.log('Auto-start is only supported on Windows');
        return;
    }

    try {
        const taskName = 'AutoAnswerServer';
        execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'ignore' });
        console.log('Auto-start removed');
    } catch {
        console.log('Auto-start task not found');
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
    case 'install':
        installAutoStart();
        break;
    case 'uninstall':
        uninstallAutoStart();
        break;
}