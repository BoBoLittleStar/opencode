import type {Plugin} from "@opencode-ai/plugin";
import { getCurrentPID } from '../util';
import { execSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';

/**
 * 获取 opencode 子进程 PID 列表
 */
function getOpencodeChildPIDs(): number[] {
    try {
        const out = execSync(`powershell -Command "Get-OpencodeChildProcessId"`, {
            encoding: 'utf8',
            windowsHide: true
        });
        return out.trim().split('\n').filter(Boolean).map(Number);
    } catch {
        return [];
    }
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
    if (/-[cc]\s+["']|["']\s+-c\b/i.test(command)) {
        return true;
    }
    // -Command= 格式
    if (/-command=/i.test(trimmed)) {
        return true;
    }
    return false;
}

/**
 * 检测是否为进程结束/查看命令
 */
function isProcessCommand(command: string): boolean {
    return /(?:stop|kill|terminate|ps|get-process|tasklist)\s+/i.test(command);
}

export const ToolListener: Plugin = async () => {
    const currentPID = getCurrentPID();
    const childPIDs = getOpencodeChildPIDs();
    // 获取用户 home 目录
    const homeDir = os.homedir();

    return {
        'tool.execute.before': async (input, {args}) => {
            if (input.tool === 'bash') {
                const bashArgs = args as { command?: string; commands?: string[] };
                const commands = bashArgs.commands || (bashArgs.command ? [bashArgs.command] : []);

                for (const command of commands) {
                    // === 需求 1.1: 非 powershell 命令结束进程 (先检查) ===
                    if (isProcessCommand(command)) {
                        if (!isPowerShellCommand(command)) {
                            throw new Error(
                                `安全拦截：只允许使用 powershell 命令结束进程\n` +
                                `检测到命令: ${command}`
                            );
                        }
                    }

                    // === 需求 1.2: 通过名称结束 opencode/node ===
                    // 支持多种格式，包括 -Command 引号内的命令
                    const namePattern = /(?:stop-?process|kill|terminate|ps|get-?process|tasklist)\s+(?:-[nNIi]|\/IM|-name\s+|-Name\s+|\/name\s*)\s*(?:opencode|node|node\.exe)/i;
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
                            `检测到命令: ${command}`
                        );
                    }

                    // === 需求 1.3 & 1.4: 结束当前进程或子进程 ===
                    const pidMatch = command.match(/\b(\d+)\b/);
                    if (pidMatch) {
                        const targetPID = parseInt(pidMatch[1], 10);
                        if (targetPID === currentPID) {
                            throw new Error(
                                `安全拦截：禁止结束正在运行的 opencode 进程 (PID: ${targetPID})\n` +
                                `检测到命令: ${command}`
                            );
                        }
                        if (childPIDs.includes(targetPID)) {
                            throw new Error(
                                `安全拦截：禁止结束当前 opencode 进程的子进程 (PID: ${targetPID})\n` +
                                `检测到命令: ${command}`
                            );
                        }
                    }

                    // === 需求 2: ~/.config/opencode 目录访问 ===
                    const normalizedCommand = command.replace(/\\/g, '/');
                    if (normalizedCommand.includes('.config/opencode') || normalizedCommand.includes(`${homeDir.replace(/\\/g, '/')}/.config/opencode`)) {
                        throw new Error(
                            `配置拦截：请在 env:OPENCODE_CONFIG_DIR 下进行 opencode 的配置工作\n` +
                            `检测到命令: ${command}`
                        );
                    }
                }
            }

            // === 需求 3: 提问拦截 ===
            if (input.tool === 'question' || input.tool === 'ask' || input.tool === 'gpt-ask') {
                throw new Error(
                    `问题拦截：请使用 Auto-Answer MCP 进行提问\n`
                );
            }
        }
    };
};