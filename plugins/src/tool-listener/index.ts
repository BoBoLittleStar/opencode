import { Plugin } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";
import { isMatch } from "../libs/match";
import { blocklist } from "./blocklist";

export const BA_ToolListener: Plugin = async () => {
    const logger = getLogger();
    logger.info("OMO started. Tool listener started.");
    return {
        "tool.execute.before": async ({ tool }, { args }) => {
            if (blocklist.some((block) => "tool" in block && isMatch({ tool, args }, block.tool))) {
                return;
            }
            logger.info(args && Object.keys(args) ? [...`Executing tool: ${tool}`, args] : `Executing tool: ${tool}`);
        },
        event: async ({ event }) => {
            if (blocklist.some((item) => "event" in item && isMatch(event, item.event))) {
                return;
            }
            logger.info(`Event type: ${event.type}`, event.properties);
        },
    };
};
