import { Plugin, tool } from "@opencode-ai/plugin";

export const Demo: Plugin = async () => {
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
