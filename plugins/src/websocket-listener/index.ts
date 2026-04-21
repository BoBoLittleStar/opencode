import type { Plugin } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";

export const CA_WebSocketListener: Plugin = async () => {
    const port = "8881";

    let ws: WebSocket | null = null;

    const connectWebSocket = (): Promise<WebSocket> =>
        new Promise((resolve, reject) => {
            getLogger().info(`[WebSocket] Connecting to ws://localhost:${port}...`);

            const socket = new WebSocket(`ws://localhost:${port}`);

            socket.onopen = () => {
                getLogger().info("[WebSocket] Connected!");
                resolve(socket);
            };

            // Timeout handles ALL failure cases - prevents unresolved Promise
            setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    socket.close();
                    getLogger().info("[WebSocket] Connection failed, skipping...");
                    reject(new Error("Connection failed"));
                }
            }, 3000);
        });

    const setupSocketHandlers = (): void => {
        if (!ws) return;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                getLogger().info(`[WebSocket] Received: ${JSON.stringify(data)}`);
            } catch {
                getLogger().info(`[WebSocket] Received: ${event.data}`);
            }
        };
    };

    const sendToWebSocket = (data: unknown): void => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            getLogger().warn("[WebSocket] Not connected, cannot send message");
            return;
        }

        try {
            ws.send(JSON.stringify(data));
        } catch (err) {
            getLogger().error(`[WebSocket] Send failed: ${(err as Error).message}`);
        }
    };

    // Connect to WebSocket on plugin initialization - only attempt once
    try {
        ws = await connectWebSocket();
        getLogger().info("[WebSocket] Connected");
        setupSocketHandlers();
    } catch (err) {
        getLogger().warn(`[WebSocket] Connection failed, plugin disabled: ${(err as Error).message}`);
        return {};
    }

    return {
        // Listen to chat message events
        "chat.message": async ({ sessionID, agent, model, messageID, variant }, { message, parts }) => {
            // Get message content safely - cast to any to access common properties
            const msg = message as any;
            const content = msg.content || msg.text || "";
            const chatData = {
                type: "chat.message",
                sessionID,
                agent,
                model,
                messageID,
                variant,
                message: content,
                parts: parts.map((p) => ("text" in p ? p.text : "content" in p ? p.content : null)).filter(Boolean),
                timestamp: new Date().toISOString(),
            };
            sendToWebSocket(chatData);
        },

        // Listen to tool execution events
        "tool.execute.after": async (input, { title, output }) => {
            const toolData = {
                type: "tool.execute.after",
                tool: input.tool,
                sessionID: input.sessionID,
                callID: input.callID,
                title,
                output: output.substring(0, 1000), // Truncate long outputs
                timestamp: new Date().toISOString(),
            };
            sendToWebSocket(toolData);
        },

        // Event hook for session events
        event: async ({ event }) => {
            const evt = event as any;
            getLogger().info(`[WebSocket] Event: ${evt.type}`);

            // Send session start event
            if (evt.type === "session.start") {
                sendToWebSocket({
                    type: "session.start",
                    timestamp: new Date().toISOString(),
                });
            }
        },
    };
};
