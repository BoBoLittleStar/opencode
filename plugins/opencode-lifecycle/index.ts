import { Plugin, tool } from "@opencode-ai/plugin";
import child_process from "node:child_process";
import { getLogger } from "../libs/logger";
import { globalState } from "../shared/state";

export const BB_OpencodeLifeCycle: Plugin = async ({ client, $ }) => {
    const params: { pending: boolean; env: RestartParam } = {
        pending: false,
        env: {
            OPENCODE_RESTART: "0",
            OPENCODE_RESTART_LAST_PID: "",
        },
    };

    type RestartParam = {
        OPENCODE_RESTART: "0" | "1";
        OPENCODE_RESTART_LAST_PID: string;
    };

    const { OPENCODE_RESTART, OPENCODE_RESTART_LAST_PID } = process.env as RestartParam;
    if (OPENCODE_RESTART === "1") {
        client.session.list().then((list) => {
            if (list.data?.[0]) {
                const sessionId = list.data[0].id;
                if (OPENCODE_RESTART_LAST_PID) {
                    $`powershell -Command "Stop-Process -Id ${OPENCODE_RESTART_LAST_PID}"`.catch(getLogger().error);
                }
                client.session
                    .messages({ path: { id: sessionId } })
                    .then(
                        (messages) =>
                            (messages.data?.find((message) => message.info.role === "assistant")?.info as any)?.agent,
                    )
                    .then((agent) => {
                        client.session
                            .promptAsync({
                                path: { id: sessionId },
                                body: {
                                    agent,
                                    parts: [
                                        {
                                            type: "text",
                                            text: "Opencode restarted successfully. You can now resume your work.",
                                        },
                                    ],
                                },
                            })
                            .catch(getLogger().error);
                    });
            }
        });
    }
    return {
        tool: {
            restart_opencode: tool({
                description: "Restart Opencode process and continue the last session",
                args: {},
                async execute({}, { agent }) {
                    if (params.pending) {
                        return "Restart already scheduled, please don't repeat the request.";
                    }
                    params.pending = true;
                    globalState["restart-pending"] = true;
                    return "Restart scheduled, please stop your work immediately.";
                },
            }),
        },
        "tool.execute.before": async ({ tool }) => {
            if (params.pending) {
                throw new Error(
                    tool === "restart_opencode"
                        ? "Restart already scheduled, please don't repeat the request"
                        : "Please stop your work immediately and wait for restart.",
                );
            }
        },
        event: async ({ event }) => {
            // Listen for session.idle event and execute pending restart
            if (event.type === "session.idle" && params.pending) {
                params.env.OPENCODE_RESTART = "1";
                params.env.OPENCODE_RESTART_LAST_PID = `${process.pid}`;
                const env = { ...process.env, ...params.env };
                child_process.spawn("wt", ["powershell", "-Command", "omo -c"], { env }).on("error", (err: any) => {
                    if (err.code !== "ENOENT") {
                        getLogger().error(err);
                        return;
                    }
                    child_process
                        .spawn("bash", ["-l", "-c", "omo -c"], { env })
                        .on("error", () => getLogger().error("No available shell environments to restart omo!"));
                });
            }
        },
    };
};
