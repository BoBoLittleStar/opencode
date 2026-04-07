import type {Plugin} from "@opencode-ai/plugin";
import {getCurrentPID, getLogger} from '../util';


// Regex patterns to detect process kill commands
const KILL_PATTERNS = [
    /Stop-Process\s+-Id\s+(\d+)/i,           // PowerShell: Stop-Process -Id 12345
    /Stop-Process\s+-PID\s+(\d+)/i,          // PowerShell: Stop-Process -PID 12345
    /taskkill\s+\/PID\s+(\d+)/i,             // CMD: taskkill /PID 12345
    /taskkill\s+\/F\s+\/PID\s+(\d+)/i,       // CMD: taskkill /F /PID 12345
    /kill\s+-(\d+)/,                         // Unix: kill -12345
    /kill\s+(\d+)/,                          // Unix: kill 12345
];


/**
 * Extract potential PID from a command string
 * Returns the first PID found that matches kill patterns
 */
function extractPIDFromCommand(command: string): number | null {
    for (const pattern of KILL_PATTERNS) {
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


/**
 * Check if a command targets a specific PID
 */
function isProcessKillCommand(command: string): boolean {
    const killIndicators = [
        /Stop-Process/i,
        /taskkill/i,
        /kill\s+-?\d+/i,
    ];
    return killIndicators.some(pattern => pattern.test(command));
}


/**
 * Check if a command contains the force execute bypass comment
 */
function hasForceExecuteBypass(command: string): boolean {
    return /#FORCE_EXECUTE/i.test(command);
}


export const ToolListener: Plugin = async ({client}) => {
    const logger = getLogger();
    const currentPID = getCurrentPID();

    return {
        'tool.execute.before': async (input, {args}) => {
            if (input.tool === 'bash') {
                const bashArgs = args as { command?: string; commands?: string[] };
                const commands = bashArgs.commands || (bashArgs.command ? [bashArgs.command] : []);
                logger.info(commands);
                for (const command of commands) {
                    if (isProcessKillCommand(command)) {
                        const targetPID = extractPIDFromCommand(command);

                        if (targetPID !== null) {
                            // Check for bypass comment
                            if (hasForceExecuteBypass(command)) {
                                logger.warn(`Process kill command with FORCE_EXECUTE bypass for PID ${targetPID}`);
                                continue;
                            }

                            // Check if target PID matches current process
                            if (targetPID === currentPID) {
                                throw new Error(
                                    `安全拦截：禁止杀死当前 opencode 进程 (PID: ${currentPID})\n` +
                                    `检测到目标 PID ${targetPID} 与当前进程 PID 相同。\n` +
                                    `如确需执行，请添加注释 "#FORCE_EXECUTE" 跳过此检查。`
                                );
                            }

                            logger.warn(`Detected process kill command targeting PID ${targetPID}, current PID is ${currentPID}`);
                        }
                    }
                }
            }
        }
    };
};
