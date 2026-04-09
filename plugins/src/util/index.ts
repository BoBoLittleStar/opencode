import * as fs from 'fs';
import * as path from 'path';
import {traceParentProcessChain} from './process';

const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}_${String(date.getMinutes()).padStart(2, '0')}_${String(date.getSeconds()).padStart(2, '0')}`;

class Logger {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.join(process.cwd(), `app_${format(new Date())}.log`);
    }

    private write(level: string, ...messages: any[]): void {
        const time = format(new Date());
        messages.forEach(message => {
            const logMessage = `[${time}] [${level.toUpperCase()}] ${typeof message === 'object' ? JSON.stringify(message) : message}\n`;
            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath);
                if (level !== 'error' && stats.size >= 1048576) {
                    this.error('logger file too large');
                    throw new Error('logger file too large');
                }
            }
            fs.appendFileSync(this.filePath, logMessage);
        });
    }

    debug(...messages: any[]): void { this.write('debug', ...messages); }
    info(...messages: any[]): void { this.write('info', ...messages); }
    warn(...messages: any[]): void { this.write('warn', ...messages); }
    error(...messages: any[]): void { this.write('error', ...messages); }
}

const logger = new Logger();
export const getLogger = () => logger;

export function getCurrentPID(): number {
    return traceParentProcessChain().opencodePID;
}
