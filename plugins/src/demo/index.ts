import { Plugin, tool } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";

export const Demo: Plugin = async () => {
    getLogger().info("[Demo] Plugin loaded! Version 1.3.3");

    return {
        tool: {
            demo_version: tool({
                description: "Get the demo plugin version",
                args: {},
                async execute() {
                    return "1.3.3";
                },
            }),
        },
    };
};
