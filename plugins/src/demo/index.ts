import type {Plugin} from "@opencode-ai/plugin";
import {tool} from "@opencode-ai/plugin";

export const Demo: Plugin = async (ctx) => {
    return {
        tool: {
            demo: tool({
                description: "Demo tool that prints a message",
                args: {},
                async execute(args, context) {
                    return "Demo plugin is working";
                },
            }),
        },
    };
};
