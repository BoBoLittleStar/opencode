import { Plugin, tool } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";

// Track sessions that have been marked as done
const sessionsDone = new Set<string>();
// Track the last agent for each session
const sessionsAgent = new Map<string, string>();

export const BC_IdleReminder: Plugin = async (input) => {
    const client = input.client;
    const state = {
        busy: false,
        remind: true,
    };

    return {
        tool: {
            reminder_stop: tool({
                description:
                    "Set work to completed to disable auto-reminder. This tool must be called only when explicitly requested.",
                args: {},
                execute: async ({ status }, context) => {
                    state.remind = false;
                    getLogger().info("set state remind to false");
                    return "ok";
                },
            }),
        },
        event: async ({ event }) => {
            // Track the last agent from assistant messages
            if (event.type === "message.updated") {
                if (event.properties.info.role === "user") {
                    if (event.properties.info.agent) {
                        sessionsAgent.set(event.properties.info.sessionID, event.properties.info.agent);
                    }
                }
            }

            if (event.type === "message.part.updated") {
                if (event.properties.part.type === "text") {
                    const type = event.properties.part.metadata?.type;
                    if (type !== "auto") {
                        state.remind = true;
                    }
                }
            }

            // Handle idle event - only if session not marked as done
            if (event.type === "session.status") {
                if (event.properties.status.type === "busy") {
                    state.busy = true;
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
                                    text: "[自动提醒] 如果你认为已经回答了所有问题或者完成了所有工作，你必须调用 reminder_stop 工具以停止此自动提醒",
                                    metadata: {
                                        type: "auto",
                                    },
                                },
                            ],
                        },
                    });
                }
            }
        },
    };
};
