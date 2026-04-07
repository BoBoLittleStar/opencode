import * as fs from 'fs';
import * as path from 'path';
import {traceParentProcessChain} from './process';

const format = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}_${minutes}_${seconds}`;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private readonly filePath: string;

    constructor() {
        const time = format(new Date());
        this.filePath = path.join(process.cwd(), `app_${time}.log`);
    }

    private write(level: LogLevel, ...messages: any[]): void {
        const time = format(new Date());
        messages.forEach(message => {
            if (typeof message === 'object') {
                message = JSON.stringify(message);
            }
            const logMessage = `[${time}] [${level.toUpperCase()}] ${message}\n`;
            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath);
                if (level !== 'error' && stats.size >= 1048576) {
                    this.error('logger file too large');
                    throw new Error('logger file too large');
                }
            }
            fs.appendFileSync(this.filePath, logMessage);
        })
    }

    debug(...messages: any[]): void {
        this.write('debug', ...messages);
    }

    info(...messages: any[]): void {
        this.write('info', ...messages);
    }

    warn(...messages: any[]): void {
        this.write('warn', ...messages);
    }

    error(...messages: any[]): void {
        this.write('error', ...messages);
    }
}

const logger = new Logger();
export const getLogger = () => logger;


/**
 * Get current opencode process PID by tracing the parent process chain
 * Equivalent to my-pid tool - finds opencode.exe in the process tree
 */
export function getCurrentPID(): number {
    const result = traceParentProcessChain();
    return result.opencodePID;
}
