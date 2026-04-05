import type {Plugin} from "@opencode-ai/plugin";
import {getLogger} from '../util';


export const ToolListener: Plugin = async () => {
    const logger = getLogger();

    return {
        'tool.execute.before': async (input, output: { args: unknown }) => {
            logger.info(`Tool executed: ${input.tool}`);
        }
    };
};
