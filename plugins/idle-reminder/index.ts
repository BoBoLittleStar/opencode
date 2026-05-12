import { Plugin, tool } from "@opencode-ai/plugin";
import { globalState } from "../shared/state";

// Track the last agent for each session
const sessionsAgent = new Map<string, string>();
// Track sessions that were aborted by user (per-session, survives event timing issues)
const abortedSessions = new Set<string>();

export const BC_IdleReminder: Plugin = async ({ client }) => {
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
            // Assistant message has error → response was interrupted (stop/new msg/etc.)
            // More reliable than session.error: error is embedded in the message itself
            if (
                event.type === "message.updated" &&
                event.properties.info.role === "assistant" &&
                event.properties.info.error
            ) {
                const sessionID = (event.properties as { sessionID?: string }).sessionID;
                if (sessionID) {
                    abortedSessions.add(sessionID);
                }
            }

            // Track the last agent from the session for routing reminder to correct agent
            if (
                event.type === "message.updated" &&
                event.properties.info.role === "user" &&
                event.properties.info.agent &&
                !sessionsAgent.has(event.properties.info.sessionID)
            ) {
                sessionsAgent.set(event.properties.info.sessionID, event.properties.info.agent);
            }

            // Track user-initiated aborts — don't auto-reply after abort
            if (event.type === "session.error") {
                const error = event.properties.error;
                // MessageAbortedError is the definitive signal for user-initiated abort
                if (error?.name === "MessageAbortedError") {
                    if (event.properties.sessionID) {
                        abortedSessions.add(event.properties.sessionID);
                    }
                    return;
                }
            }

            // Handle idle event - only if session not marked as done
            if (event.type === "session.status") {
                if (event.properties.status.type === "busy") {
                    state.busy = true;
                } else if (event.properties.status.type === "idle") {
                    state.busy = false;

                    const { sessionID } = event.properties;

                    // Check immediately if session was aborted by user
                    if (abortedSessions.has(sessionID)) {
                        abortedSessions.delete(sessionID);
                        return;
                    }

                    // Restart pending - don't send auto-reminder
                    if (globalState["restart-pending"]) {
                        return;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    if (state.busy) {
                        return;
                    }
                    if (!state.remind) {
                        state.remind = true;
                        return;
                    }

                    // Re-check after delay: session.error may arrive after session.status(idle)
                    // This handles the timing edge case where error event is slightly delayed
                    if (abortedSessions.has(sessionID)) {
                        abortedSessions.delete(sessionID);
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
                                    text: "[自动提醒] 如果你认为已经回答完毕所有问题，或是完成了所有工作，或是需要用户的进一步输入，你必须调用 reminder_stop 工具以停止此自动提醒",
                                },
                            ],
                        },
                    });
                }
            }
        },
    };
};
