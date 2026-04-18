import { Plugin, tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";
import * as child_process from "node:child_process";
import * as os from "os";
import { getLogger } from "../libs/logger";
import { getCurrentPID, traceParentProcessChain } from "../libs/process";

export const SecurityChecker: Plugin = async ({ client, $ }) => {
    const params: { pending: boolean; env: RestartParam } = {
        pending: false,
        env: {
            OPENCODE_RESTART_SESSION_ID: "",
            OPENCODE_RESTART_AGENT: "",
            OPENCODE_RESTART_LAST_PID: "",
        },
    };

    type RestartParam = {
        OPENCODE_RESTART_SESSION_ID: string;
        OPENCODE_RESTART_AGENT: string;
        OPENCODE_RESTART_LAST_PID: string;
    };

    /**
     * 获取 opencode 子进程 PID 列表
     */
    function getOpencodeChildPIDs(): number[] {
        const out = execSync(`powershell -Command "Get-OpencodeChildProcessId"`, {
            encoding: "utf8",
            windowsHide: true,
        });
        return out.trim().split("\n").filter(Boolean).map(Number);
    }

    /**
     * 检测是否为进程结束/查看命令
     */
    function isProcessCommand(command: string): boolean {
        return /(?:stop|kill|terminate|ps|get-process|tasklist)\s+/i.test(command);
    }

    /**
     * 判断命令是否为 powershell 命令
     * 匹配 powershell 或 ps 开头，或者包含 -Command 参数
     */
    function isPowerShellCommand(command: string): boolean {
        const trimmed = command.trim().toLowerCase();
        // powershell.exe, pwsh, ps 等开头
        if (/^(powershell|pwsh|ps)\s*\.?exe?/i.test(trimmed)) {
            return true;
        }
        // -Command 或 -C 参数
        if (/-c\s+["']|["']\s+-c\b/i.test(command)) {
            return true;
        }
        // -Command= 格式
        return /-command=/i.test(trimmed);
    }

    const currentPID = getCurrentPID();
    const childPIDs = getOpencodeChildPIDs();
    // 获取用户 home 目录
    const homeDir = os.homedir();
    const restartParam = process.env as RestartParam;
    if (restartParam.OPENCODE_RESTART_SESSION_ID) {
        if (restartParam.OPENCODE_RESTART_LAST_PID) {
            $`powershell -Command "Stop-Process -Id ${restartParam.OPENCODE_RESTART_LAST_PID}"`.catch(
                getLogger().error,
            );
        }
        client.session
            .promptAsync({
                path: {
                    id: restartParam.OPENCODE_RESTART_SESSION_ID,
                },
                body: {
                    agent: restartParam.OPENCODE_RESTART_AGENT,
                    parts: [
                        {
                            type: "text",
                            text: "Opencode restarted successfully. You can now resume your work.",
                        },
                    ],
                },
            })
            .catch(getLogger().error);
    }

    return {
        tool: {
            get_opencode_pid: tool({
                description: "Get the current opencode process ID by tracing the parent process chain",
                args: {},
                async execute() {
                    const result = traceParentProcessChain();

                    if (result.opencodePID === result.currentPID || result.chain === "") {
                        return `Current node PID: ${result.currentPID}\nOpencode PID: Not found\nChain: ${result.chain}`;
                    }

                    return `Current node PID: ${result.currentPID}\nOpencode PID: ${result.opencodePID}\nChain: ${result.chain}`;
                },
            }),
            restart_opencode: tool({
                description: "Restart Opencode process and continue the last session",
                args: {},
                async execute({}, { agent }) {
                    if (params.pending) {
                        return "Restart already scheduled, please don't repeat the request.";
                    }
                    params.pending = true;
                    params.env.OPENCODE_RESTART_AGENT = agent;
                    return "Restart scheduled, please stop your work immediately.";
                },
            }),
        },
        "tool.execute.before": async ({ tool }, { args }) => {
            if (params.pending) {
                throw new Error(
                    tool === "restart_opencode"
                        ? "Restart already scheduled, please don't repeat the request"
                        : "Please stop your work immediately and wait for restart.",
                );
            }
            if (tool === "bash") {
                const bashArgs = args as {
                    command?: string;
                    commands?: string[];
                };
                const commands = bashArgs.commands || (bashArgs.command ? [bashArgs.command] : []);

                for (const command of commands) {
                    // === 需求 1: 非 powershell 命令结束进程 (先检查) ===
                    if (isProcessCommand(command)) {
                        if (!isPowerShellCommand(command)) {
                            throw new Error(
                                `安全拦截：只允许使用 powershell 命令结束进程\n` + `检测到命令: ${command}`,
                            );
                        }
                    }

                    // === 需求 2: 通过名称结束 opencode/node ===
                    // 支持多种格式，包括 -Command 引号内的命令
                    const namePattern =
                        /(?:stop-?process|kill|terminate|ps|get-?process|tasklist)\s+(?:-[nNIi]|\/IM|-name\s+|-Name\s+|\/name\s*)\s*(?:opencode|node|node\.exe)/i;
                    // 提取 -Command "xxx" 格式的命令
                    let cmdExtract = command;
                    const cmdMatch = command.match(/-Command\s+"(.+)"/i);
                    if (cmdMatch) {
                        cmdExtract = cmdMatch[1].trim();
                    }
                    // 检查名称拦截
                    if (namePattern.test(command) || namePattern.test(cmdExtract)) {
                        throw new Error(
                            `安全拦截：禁止通过名称结束 opencode 或 node 进程，请使用进程 ID 操作\n` +
                                `检测到命令: ${command}`,
                        );
                    }

                    // === 需求 3: 结束当前进程或子进程 ===
                    const pidMatch = command.match(/\b(\d+)\b/);
                    if (pidMatch) {
                        const targetPID = parseInt(pidMatch[1], 10);
                        if (targetPID === currentPID) {
                            throw new Error(
                                `安全拦截：禁止结束正在运行的 opencode 进程 (PID: ${targetPID})\n` +
                                    `检测到命令: ${command}`,
                            );
                        }
                        if (childPIDs.includes(targetPID)) {
                            throw new Error(
                                `安全拦截：禁止结束当前 opencode 进程的子进程 (PID: ${targetPID})\n` +
                                    `检测到命令: ${command}`,
                            );
                        }
                    }

                    // === 需求 4: ~/.config/opencode 目录访问 ===
                    const normalizedCommand = command.replace(/\\/g, "/");
                    if (
                        normalizedCommand.includes(".config/opencode") ||
                        normalizedCommand.includes(`${homeDir.replace(/\\/g, "/")}/.config/opencode`)
                    ) {
                        throw new Error(
                            `配置拦截：请在 env:OPENCODE_CONFIG_DIR 下进行 opencode 的配置工作\n` +
                                `检测到命令: ${command}`,
                        );
                    }
                }
            }
        },
        event: async ({ event }) => {
            // Listen for session.idle event and execute pending restart
            if (event.type === "session.idle" && params.pending) {
                params.env.OPENCODE_RESTART_SESSION_ID = event.properties.sessionID;
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
