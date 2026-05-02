import { Plugin } from "@opencode-ai/plugin";
import { TextPart, TextPartInput } from "@opencode-ai/sdk";
import { getLogger } from "../libs/logger";

// Track sessions that have been marked as done
const sessionsDone = new Set<string>();

export const BC_IdleReminder: Plugin = async (input) => {
    const logger = getLogger();
    const client = input.client;

    return {
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

            // Handle idle event - only if session not marked as done
            if (event.type === "session.idle") {
                const { sessionID } = event.properties;

                // Skip if already marked as done
                if (sessionsDone.delete(sessionID)) {
                    return;
                }

                await new Promise((resolve) => setTimeout(resolve, 3000));

                logger.info(`Sending reminder to session ${sessionID}`);
                await client.session.prompt({
                    path: { id: sessionID },
                    body: {
                        parts: [{ type: "text", text: "你已经做完了吗" } as TextPartInput],
                    },
                });
            }
        },
    };
};
