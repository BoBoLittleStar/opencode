#!/usr/bin/env node
/**
 * MCP Auto Answer Adapter
 * 
 * MCP (Model Context Protocol) adapter for auto-answer.js
 * Implements JSON-RPC 2.0 protocol over stdin/stdout
 */

const http = require('http');

const DEFAULT_PORT = 17346;

// Get port from environment or default
const PORT = process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT, 10) : DEFAULT_PORT;
const BASE_URL = `http://localhost:${PORT}`;

// MCP Protocol Implementation

function sendResponse(id, result) {
    const response = { jsonrpc: '2.0', id, result };
    process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id, code, message) {
    const response = {
        jsonrpc: '2.0',
        id,
        error: { code, message }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
}

function sendNotification(method, params) {
    const notification = { jsonrpc: '2.0', method, params };
    process.stdout.write(JSON.stringify(notification) + '\n');
}

// HTTP request helper
function httpRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const postData = body ? JSON.stringify(body) : null;
        
        const options = {
            hostname: '127.0.0.1',
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData ? Buffer.byteLength(postData) : 0
            },
            timeout: 5000
        };

        const req = http.request(options);
        
        req.on('response', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });
        
        req.on('error', reject);
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        const timeoutId = setTimeout(() => {
            req.destroy();
            reject(new Error('Request timeout'));
        }, 5000);

        if (postData) {
            req.write(postData);
        }
        
        req.end();
        clearTimeout(timeoutId);
    });
}

// Tool definitions
const TOOLS = [
    {
        name: 'get_questions',
        description: 'Get all questions with their answers',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'add_questions',
        description: 'Add new questions to the database',
        inputSchema: {
            type: 'object',
            properties: {
                questions: {
                    type: 'array',
                    description: 'Array of question objects',
                    items: {
                        type: 'object',
                        properties: {
                            group_id: { type: 'string', description: 'UUID of the question group' },
                            source_id: { type: 'string', description: 'UUID of the source' },
                            content: { type: 'string', description: 'Question text' },
                            options: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        isCorrect: { type: 'boolean' }
                                    },
                                    required: ['text']
                                }
                            },
                            multiple: { type: 'boolean', description: 'Allow multiple answers' }
                        },
                        required: ['group_id', 'source_id', 'content', 'options']
                    }
                }
            },
            required: ['questions']
        }
    },
    {
        name: 'add_answers',
        description: 'Submit answers to questions',
        inputSchema: {
            type: 'object',
            properties: {
                answers: {
                    type: 'array',
                    description: 'Array of answer objects',
                    items: {
                        type: 'object',
                        properties: {
                            group_id: { type: 'string', description: 'UUID of the question group' },
                            questionId: { type: 'string', description: 'UUID of the question' },
                            source_id: { type: 'string', description: 'UUID of the source' },
                            answer: { type: 'string', description: 'Selected answer text' }
                        },
                        required: ['group_id', 'questionId', 'source_id']
                    }
                }
            },
            required: ['answers']
        }
    },
    {
        name: 'clean_old_data',
        description: 'Clean old question data from the database',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'server_status',
        description: 'Check if the server is running',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    }
];

// Tool handlers
async function handleToolCall(toolName, arguments_) {
    switch (toolName) {
        case 'get_questions': {
            const result = await httpRequest('GET', '/api/questions');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        }

        case 'add_questions': {
            if (!arguments_ || !arguments_.questions) {
                throw new Error('Missing required parameter: questions');
            }
            const result = await httpRequest('POST', '/api/questions', {
                questions: arguments_.questions
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        }

        case 'add_answers': {
            if (!arguments_ || !arguments_.answers) {
                throw new Error('Missing required parameter: answers');
            }
            const result = await httpRequest('POST', '/api/answers', {
                answers: arguments_.answers
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        }

        case 'clean_old_data': {
            const result = await httpRequest('POST', '/api/clean');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        }

        case 'server_status': {
            try {
                await httpRequest('GET', '/api/questions');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Server is running on port ${PORT}`
                        }
                    ]
                };
            } catch (err) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Server is not running on port ${PORT}`
                        }
                    ]
                };
            }
        }

        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

// MCP Protocol handlers
async function handleRequest(method, params) {
    switch (method) {
        case 'initialize': {
            return {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'auto-answer-mcp',
                    version: '1.0.0'
                }
            };
        }

        case 'tools/list': {
            return {
                tools: TOOLS
            };
        }

        case 'tools/call': {
            const { name, arguments: args } = params;
            try {
                const result = await handleToolCall(name, args);
                return result;
            } catch (err) {
                throw new Error(`Tool execution failed: ${err.message}`);
            }
        }

        case 'notifications/initialized': {
            return null;
        }

        default:
            throw new Error(`Method not found: ${method}`);
    }
}

// Main message loop
process.stdin.setEncoding('utf-8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
        if (!line.trim()) continue;

        try {
            const request = JSON.parse(line);
            const { id, method, params } = request;

            if (method === 'initialize') {
                const result = await handleRequest(method, params);
                sendResponse(id, result);
                sendNotification('notifications/initialized', {});
            } else {
                try {
                    const result = await handleRequest(method, params);
                    if (id !== undefined) {
                        sendResponse(id, result);
                    }
                } catch (err) {
                    sendError(id, -32603, err.message);
                }
            }
        } catch (err) {
            try {
                const request = JSON.parse(line);
                sendError(request.id, -32603, err.message);
            } catch {}
        }
    }
});

process.stdin.on('end', () => {
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
});

console.error('MCP Auto Answer adapter started');
console.error(`Target server: http://localhost:${PORT}`);