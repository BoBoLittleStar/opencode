import type {Plugin} from "@opencode-ai/plugin";
import {getCurrentPID} from '../util';

const KILL_OPENCODE_NODE = /(?:stop|kill|terminate|ps|get-process)\s+(?:-[nNIi]|name\s+)?(?:opencode|node)/i;

function checkConfigDirAccess(command: string): boolean {
    return /\.config[\/\\]/.test(command);
}

function extractPID(command: string): number | null {
    const pidMatch = command.match(/\b(\d+)\b/);
    return pidMatch ? parseInt(pidMatch[1], 10) : null;
}

export const ToolListener: Plugin = async () => {
    const currentPID = getCurrentPID();

    return {
        'tool.execute.before': async (input, {args}) => {
            if (input.tool === 'bash') {
                const bashArgs = args as { command?: string; commands?: string[] };
                const commands = bashArgs.commands || (bashArgs.command ? [bashArgs.command] : []);

                for (const command of commands) {
                    if (KILL_OPENCODE_NODE.test(command)) {
                        throw new Error(
                            `安全拦截：禁止操作 opencode 或 node 进程，你必须获取进程 id，然后通过 id 操作\n` +
                            `检测到命令: ${command}`
                        );
                    }

                    const targetPID = extractPID(command);
                    if (targetPID !== null && targetPID === currentPID) {
                        throw new Error(
                            `安全拦截：禁止操作当前 opencode 进程 (PID: ${currentPID})\n` +
                            `检测到目标 PID ${targetPID} 与当前进程 PID 相同。`
                        );
                    }

                    if (checkConfigDirAccess(command)) {
                        throw new Error(
                            `路径拦截：检测到对 ~/.config 目录的访问\n` +
                            `请通过 env:OPENCODE_CONFIG_DIR 查找 opencode 配置\n` +
                            `检测到命令: ${command}`
                        );
                    }
                }
            }
        }
    };
};
