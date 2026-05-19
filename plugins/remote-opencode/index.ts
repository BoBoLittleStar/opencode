import { Plugin, tool } from "@opencode-ai/plugin";
import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";

// 环境变量名称
const ENV_REMOTE_CONNECT = "OPENCODE_REMOTE_CONNECT";
const ENV_SERVER_URL = "OPENCODE_SERVER_URL";

// 端口配置
const WS_SERVER_PORT = 8881;
const HTTP_MIDDLEWARE_PORT = 8882;

// WebSocket 状态常量
const WS_STATE = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
};

// 状态管理
let wsClient: WebSocket | null = null;
let wsServerInstance: WebSocketServer | null = null;
let httpServerInstance: http.Server | null = null;
let middlewareWsClient: WebSocket | null = null;
let isRestarting = false;

// 消息队列（中间件用）
const messageQueue: string[] = [];

// 心跳定时器
let heartbeatTimer: NodeJS.Timeout | null = null;

// 日志函数
function log(level: "info" | "error" | "warn", message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [remote-opencode] [${level.toUpperCase()}] ${message}`, data || "");
}

// 创建 WebSocket 服务端
function createWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        wsServerInstance = new WebSocketServer({ port: WS_SERVER_PORT });

        wsServerInstance.on("listening", () => {
            log("info", `WebSocket server started on port ${WS_SERVER_PORT}`);
            resolve();
        });

        wsServerInstance.on("error", (error: Error) => {
            log("error", "WebSocket server error", error);
            reject(error);
        });

        wsServerInstance.on("connection", (ws: WebSocket, req: any) => {
            log("info", "New connection from OpenCode");

            // 关闭旧连接（如果存在）
            if (wsClient && wsClient.readyState === WS_STATE.OPEN) {
                log("info", "Closing old connection");
                wsClient.close();
            }

            wsClient = ws;

            // 通知中间件：opencode 已连接
            sendToMiddleware("opencode 已连接");

            // 处理消息
            ws.addEventListener("message", (event) => {
                const message = event.data.toString();
                log("info", "Received message from OpenCode", message);

                // 转发给中间件（除了心跳消息）
                if (message !== "heartbeat") {
                    sendToMiddleware(message);
                }
            });

            // 处理连接关闭
            ws.addEventListener("close", () => {
                log("info", "OpenCode disconnected");

                // 如果不是正在重启，则通知中间件
                if (!isRestarting) {
                    sendToMiddleware("opencode 已断开");
                }

                wsClient = null;
                isRestarting = false;
            });

            // 启动心跳
            startHeartbeat(ws);

            // 立即发送第一个心跳
            ws.send("heartbeat");
        });
    });
}

// 创建 HTTP 中间件
function createHttpMiddleware(): Promise<void> {
    return new Promise((resolve, reject) => {
        httpServerInstance = http.createServer((req, res) => {
            const url = req.url;

            // 设置 CORS 头
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");

            if (req.method === "OPTIONS") {
                res.writeHead(200);
                res.end();
                return;
            }

            if (req.method !== "POST") {
                res.writeHead(405, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Method not allowed" }));
                return;
            }

            // 收集请求体
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", () => {
                try {
                    const data = body ? JSON.parse(body) : {};

                    if (url === "/send_message") {
                        // 发送消息到 OpenCode
                        if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "No OpenCode connected" }));
                            return;
                        }

                        wsClient.send(data.message);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: true }));

                    } else if (url === "/consume_message") {
                        // 消费消息队列
                        const messages = messageQueue.splice(0, 10);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ messages }));

                    } else if (url === "/health") {
                        // 健康检查
                        const status = {
                            middlewareConnected: middlewareWsClient !== null && middlewareWsClient.readyState === WebSocket.OPEN,
                            opencodeConnected: wsClient !== null && wsClient.readyState === WebSocket.OPEN,
                        };
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(status));

                    } else if (url === "/command") {
                        // 执行命令
                        const command = data.command;
                        if (command === "abort") {
                            // TODO: 实现中断当前会话
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true }));
                        } else {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Unknown command" }));
                        }

                    } else {
                        res.writeHead(404, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Not found" }));
                    }
                } catch (error) {
                    log("error", "Error handling request", error);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Internal server error" }));
                }
            });
        });

        httpServerInstance.listen(HTTP_MIDDLEWARE_PORT, () => {
            log("info", `HTTP middleware started on port ${HTTP_MIDDLEWARE_PORT}`);
            resolve();
        });

        httpServerInstance.on("error", (error: Error) => {
            log("error", "HTTP middleware error", error);
            reject(error);
        });
    });
}

// 连接中间件到服务端
function connectMiddlewareToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        middlewareWsClient = new WebSocket(`ws://localhost:${WS_SERVER_PORT}`);

        middlewareWsClient.addEventListener("open", () => {
            log("info", "Middleware connected to server");
            resolve();
        });

        middlewareWsClient.addEventListener("message", (event) => {
            const message = event.data.toString();
            log("info", "Middleware received message", message);

            // 添加到队列
            messageQueue.push(message);
        });

        middlewareWsClient.addEventListener("error", (event: any) => {
            log("error", "Middleware connection error", event.message || event);
        });

        middlewareWsClient.addEventListener("close", () => {
            log("info", "Middleware disconnected from server");
            middlewareWsClient = null;
        });

        // 启动心跳
        startHeartbeat(middlewareWsClient);

        // 立即发送第一个心跳
        middlewareWsClient.send("heartbeat");
    });
}

// 发送消息到中间件
function sendToMiddleware(message: string): void {
    if (!middlewareWsClient || middlewareWsClient.readyState !== WS_STATE.OPEN) {
        log("warn", "Middleware not connected, cannot send message");
        return;
    }

    middlewareWsClient.send(message);
}

// 启动心跳
function startHeartbeat(ws: WebSocket): void {
    // 每次收到心跳后等待 30 秒回复，间隔 60 秒
    let lastHeartbeatTime = Date.now();

    ws.addEventListener("message", (event) => {
        const message = event.data.toString();
        if (message === "heartbeat") {
            const elapsed = Date.now() - lastHeartbeatTime;
            log("info", `Received heartbeat (elapsed: ${elapsed}ms)`);

            // 等待 30 秒后回复
            setTimeout(() => {
                if (ws.readyState === WS_STATE.OPEN) {
                    ws.send("heartbeat");
                    lastHeartbeatTime = Date.now();
                }
            }, 30000);
        }
    });
}

// OpenCode 客户端连接到服务端
function connectOpenCodeToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${WS_SERVER_PORT}`);

        ws.addEventListener("open", () => {
            log("info", "OpenCode connected to server");
            resolve();
        });

        ws.addEventListener("message", (event) => {
            const message = event.data.toString();
            log("info", "OpenCode received message from server", message);

            if (message === "heartbeat") {
                // 心跳消息，不需要处理
                return;
            }

            // 其他消息：需要注入到当前会话
            // 这个逻辑将在插件钩子中处理
        });

        ws.addEventListener("error", (event: any) => {
            log("error", "OpenCode connection error", event.message || event);
            reject(new Error(event.message || String(event)));
        });

        ws.addEventListener("close", () => {
            log("info", "OpenCode disconnected from server");
            wsClient = null;
        });

        wsClient = ws;

        // 启动心跳
        startHeartbeat(ws);

        // 立即发送第一个心跳
        ws.send("heartbeat");
    });
}

// 断开连接
function disconnectOpenCodeFromServer(): void {
    if (wsClient && wsClient.readyState === WS_STATE.OPEN) {
        wsClient.close();
        wsClient = null;
    }
}

// 导出插件
export const CA_OpencodeAPI: Plugin = async ({ client }) => {
    // 在插件加载时启动服务
    log("info", "Initializing remote-opencode plugin");

    try {
        // 启动 WebSocket 服务端
        await createWebSocketServer();

        // 启动 HTTP 中间件
        await createHttpMiddleware();

        // 连接中间件到服务端
        await connectMiddlewareToServer();

        log("info", "Remote-opencode plugin initialized successfully");

        // 检查环境变量，如果 OPENCODE_REMOTE_CONNECT=1 则自动连接
        if (process.env[ENV_REMOTE_CONNECT] === "1") {
            log("info", "Auto-connecting to server based on environment variable");
            try {
                await connectOpenCodeToServer();
            } catch (error) {
                log("error", "Failed to auto-connect", error);
            }
        }
    } catch (error) {
        log("error", "Failed to initialize plugin", error);
    }

    return {
        // 定义工具
        tool: {
            connect_remote: tool({
                description: "连接到远程 opencode 服务端",
                args: {
                    url: tool.schema.string().optional().describe("服务端 URL，默认 ws://localhost:8881"),
                },
                async execute(args, context) {
                    log("info", "Executing connect_remote", args);

                    // 检查是否已连接
                    if (wsClient && wsClient.readyState === WS_STATE.OPEN) {
                        return JSON.stringify({ success: false, error: "Already connected" });
                    }

                    try {
                        await connectOpenCodeToServer();

                        // 设置环境变量
                        process.env[ENV_REMOTE_CONNECT] = "1";

                        log("info", "Connected to server successfully");
                        return JSON.stringify({ success: true });
                    } catch (error) {
                        log("error", "Failed to connect to server", error);
                        return JSON.stringify({ success: false, error: String(error) });
                    }
                },
            }),

            disconnect_remote: tool({
                description: "断开与远程 opencode 服务端的连接",
                args: {},
                async execute(args, context) {
                    log("info", "Executing disconnect_remote");

                    disconnectOpenCodeFromServer();

                    // 设置环境变量
                    process.env[ENV_REMOTE_CONNECT] = "0";

                    log("info", "Disconnected from server");
                    return JSON.stringify({ success: true });
                },
            }),
        },

        // 监听消息更新事件
        event: async ({ event }) => {
            if (event.type === "message.updated") {
                // 如果已连接，同步消息到服务端
                if (wsClient && wsClient.readyState === WS_STATE.OPEN) {
                    const message = JSON.stringify(event.properties);
                    wsClient.send(message);
                }
            } else if (event.type === "session.error") {
                // 会话中断
                if (wsClient && wsClient.readyState === WS_STATE.OPEN) {
                    wsClient.send("opencode 会话中断");
                }
            }
        },

        // 监听工具执行前事件
        "tool.execute.before": async ({ tool }) => {
            if (tool === "restart_opencode") {
                // 标记正在重启
                isRestarting = true;

                // 发送消息
                if (wsClient && wsClient.readyState === WS_STATE.OPEN) {
                    wsClient.send("opencode 正在重启");
                }
            }
        },
    };
};

// 清理函数（在进程退出时调用）
function cleanup() {
    log("info", "Cleaning up resources");

    if (wsClient) {
        wsClient.close();
    }

    if (wsServerInstance) {
        wsServerInstance.close();
    }

    if (middlewareWsClient) {
        middlewareWsClient.close();
    }

    if (httpServerInstance) {
        httpServerInstance.close();
    }

    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }
}

// 监听进程退出
process.on("exit", cleanup);
process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
});
process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
});