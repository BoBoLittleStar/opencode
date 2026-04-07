import type {Plugin} from "@opencode-ai/plugin";
import {getCurrentPID, getLogger} from '../util';


// Regex patterns for kill-by-PID
const KILL_BY_PID_PATTERNS = [
    /Stop-Process\s+-Id\s+(\d+)/i,           // PowerShell: Stop-Process -Id 12345
    /Stop-Process\s+-PID\s+(\d+)/i,          // PowerShell: Stop-Process -PID 12345
    /taskkill\s+\/PID\s+(\d+)/i,             // CMD: taskkill /PID 12345
    /taskkill\s+\/F\s+\/PID\s+(\d+)/i,       // CMD: taskkill /F /PID 12345
    /kill\s+-(\d+)/,                         // Unix: kill -12345
    /kill\s+(\d+)/,                          // Unix: kill 12345
];

// Regex pattern for kill-by-name (only block opencode)
const KILL_OPENCODE_BY_NAME_PATTERNS = [
    /taskkill\s+\/IM\s+opencode/i,              // CMD: taskkill /IM opencode.exe
    /Stop-Process\s+-Name\s+opencode/i,         // PowerShell: Stop-Process -Name opencode
];

/**
 * Extract PID from kill command if it matches known patterns
 */
function extractPID(command: string): number | null {
    for (const pattern of KILL_BY_PID_PATTERNS) {
        const match = command.match(pattern);
        if (match && match[1]) {
            const pid = parseInt(match[1], 10);
            if (!isNaN(pid) && pid > 0) {
                return pid;
            }
        }
    }
    return null;
}


export const ToolListener: Plugin = async () => {
    const logger = getLogger();
    const currentPID = getCurrentPID();

    return {
        'tool.execute.before': async (input, {args}) => {
            if (input.tool === 'bash') {
                const bashArgs = args as { command?: string; commands?: string[] };
                const commands = bashArgs.commands || (bashArgs.command ? [bashArgs.command] : []);

                for (const command of commands) {
                    // Check for kill-by-name targeting opencode
                    const isOpencodeKillByName = KILL_OPENCODE_BY_NAME_PATTERNS.some(p => p.test(command));
                    if (isOpencodeKillByName) {
                        throw new Error(
                            `安全拦截：禁止使用进程名杀死 opencode 进程\n` +
                            `检测到命令: ${command}`
                        );
                    }

                    // Check for kill-by-PID targeting current process
                    const targetPID = extractPID(command);
                    if (targetPID !== null && targetPID === currentPID) {
                        throw new Error(
                            `安全拦截：禁止杀死当前 opencode 进程 (PID: ${currentPID})\n` +
                            `检测到目标 PID ${targetPID} 与当前进程 PID 相同。`
                        );
                    }
                }
            }
        }
    };
};
