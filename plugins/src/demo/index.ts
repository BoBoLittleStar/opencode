import { Plugin, tool } from "@opencode-ai/plugin";
import { getLogger } from "../libs/logger";

export const EA_Demo: Plugin = async () => {
    getLogger().info("Plugin loaded!");
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
        event: async ({ event }) => {
            if (event.type === "session.idle") {
                getLogger().info("Session idle");
            }
        },
    };
};
