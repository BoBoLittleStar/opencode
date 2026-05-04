import { Plugin, tool } from "@opencode-ai/plugin";

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
                execute: async () => {
                    state.remind = false;
                    return "ok";
                },
            }),
        },
        event: async ({ event }) => {
            // Track the last agent from assistant messages
            if (
                event.type === "message.updated" &&
                event.properties.info.role === "user" &&
                event.properties.info.agent &&
                !sessionsAgent.has(event.properties.info.sessionID)
            ) {
                sessionsAgent.set(event.properties.info.sessionID, event.properties.info.agent);
            }

            // Handle idle event - only if session not marked as done
            if (event.type === "session.status") {
                if (event.properties.status.type === "busy") {
                    state.busy = true;
                } else if (event.properties.status.type === "idle") {
                    state.busy = false;
                    const { sessionID } = event.properties;

                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    if (state.busy) {
                        return;
                    }
                    if (!state.remind) {
                        state.remind = true;
                        return;
                    }

                    const agent = sessionsAgent.get(sessionID);
                    sessionsAgent.delete(sessionID);
                    await client.session.prompt({
                        path: { id: sessionID },
                        body: {
                            ...(agent ? { agent } : {}),
                            parts: [
                                {
                                    type: "text",
                                    text: "[自动提醒] 如果你认为已经回答了所有问题或者完成了所有工作，你必须调用 reminder_stop 工具以停止此自动提醒",
                                },
                            ],
                        },
                    });
                }
            }
        },
    };
};
