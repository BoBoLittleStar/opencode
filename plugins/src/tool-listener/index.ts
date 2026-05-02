import { Plugin } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";

export const BA_ToolListener: Plugin = async () => {
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
