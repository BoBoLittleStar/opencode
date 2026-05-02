import { Plugin } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";
import { isMatch } from "../libs/match";
import { blocks } from "./blocks";

export const BA_ToolListener: Plugin = async () => {
    const logger = getLogger();
    return {
        "tool.execute.before": async ({ tool }, input) => {
            if (blocks.some((block) => "tool" in block && isMatch({ tool, input }, block.tool))) {
                return;
            }
            logger.info("Executing tool", tool, "with input", input);
        },
        event: async ({ event }) => {
            if (blocks.some((block) => "event" in block && isMatch(event, block.event))) {
                return;
            }
            logger.info(event.type, event.properties);
        },
    };
};
