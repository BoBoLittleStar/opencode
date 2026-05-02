import { Plugin, tool } from "@opencode-ai/plugin";
import { TextPart, TextPartInput } from "@opencode-ai/sdk";
import { getLogger } from "../libs/logger";

// Track sessions that have been marked as done
const sessionsDone = new Set<string>();
// Track the last agent for each session
const sessionsAgent = new Map<string, string>();

export const BC_IdleReminder: Plugin = async (input) => {
    const logger = getLogger();
    const client = input.client;
    const state = {
        busy: false,
        remind: false,
    };

    return {
        tool: {
            status_update: tool({
                description: "Update your working status. This tool must be called only when explicitly requested.",
                args: {
                    status: tool.schema.enum(["in progress", "completed", "failed"]).describe("current working status"),
                },
                execute: async ({ status }, context) => {
                    if (status === "completed") {
                        state.remind = false;
                    }
                    return "ok";
                },
            }),
        },
        event: async ({ event }) => {
            // Listen for AI text part updates and check if marked as done
            if (event.type === "message.part.updated") {
                const { part } = event.properties;
                if (part.type === "text") {
                    const textPart = part as TextPart;
                    const text = textPart.text || "";

                    if (text.startsWith("是")) {
                        sessionsDone.add(textPart.sessionID);
                        logger.info(
                            `Session ${textPart.sessionID} marked as done based on: "${text.substring(0, 50)}..."`,
                        );
                    }
                }
            }

            // Track the last agent from assistant messages
            if (event.type === "message.updated") {
                const { message } = event.properties as any;
                if (message.info.role === "user" && message.info.agent) {
                    sessionsAgent.set(message.sessionID, message.info.agent);
                }
            }

            // Handle idle event - only if session not marked as done
            if (event.type === "session.status") {
                if (event.properties.status.type === "busy") {
                    state.busy = true;
                    state.remind = true;
                } else if (event.properties.status.type === "idle") {
                    state.busy = false;
                    const { sessionID } = event.properties;

                    // Skip if already marked as done
                    if (sessionsDone.delete(sessionID)) {
                        return;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 10000));
                    if (state.busy || !state.remind) {
                        return;
                    }

                    const agent = sessionsAgent.get(sessionID);
                    await client.session.prompt({
                        path: { id: sessionID },
                        body: {
                            ...(agent ? { agent } : {}),
                            parts: [
                                {
                                    type: "text",
                                    text: "[Reminder] If you have finished your work, please call `status_update` tool.",
                                } as TextPartInput,
                            ],
                        },
                    });
                }
            }
        },
    };
};
