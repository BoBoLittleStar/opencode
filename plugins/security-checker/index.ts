import { Plugin, tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";
import * as os from "os";
import { getCurrentPID, traceParentProcessChain } from "../libs/process";
import {
    isProcessCommand,
    isPowerShellCommand,
    checkProcessNameKill,
    checkProcessPIDKill,
} from "./checker";

export const AA_SecurityChecker: Plugin = async ({ client, $ }) => {
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

    const currentPID = getCurrentPID();
    const childPIDs = getOpencodeChildPIDs();
    const protectedPIDs = [currentPID, ...childPIDs];
    // 获取用户 home 目录
    const homeDir = os.homedir();

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
        },
        "tool.execute.before": async ({ tool }, { args }) => {
            if (tool === "bash") {
                const bashArgs = args as {
                    command?: string;
                    commands?: string[];
                };
                const commands = bashArgs.commands || (bashArgs.command ? [bashArgs.command] : []);

                for (const command of commands) {
                    // === 需求 1: 非 PowerShell 命令结束进程 (先检查) ===
                    if (isProcessCommand(command)) {
                        if (!isPowerShellCommand(command)) {
                            throw new Error(
                                `安全拦截：只允许使用 powershell 命令结束进程\n` +
                                    `检测到命令: ${command}`,
                            );
                        }
                    }

                    // === 需求 2: 禁止通过名称结束 opencode 或 node 进程 ===
                    const nameBlock = checkProcessNameKill(command);
                    if (nameBlock) {
                        throw new Error(nameBlock);
                    }

                    // === 需求 3: 禁止结束受保护的 PID（当前进程或子进程） ===
                    const pidBlock = checkProcessPIDKill(command, protectedPIDs);
                    if (pidBlock) {
                        throw new Error(pidBlock);
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
    };
};
