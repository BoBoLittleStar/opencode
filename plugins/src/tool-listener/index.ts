import { Plugin } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";

export const EA_Demo: Plugin = async () => {
    const logger = getLogger();
    return {
        "tool.execute.before": async ({ tool }, input) => {
            logger.info("Executing tool", tool, "with args", input);
        },
        event: async ({ event }) => {
            logger.info(event.type, event.properties);
        },
    };
};
