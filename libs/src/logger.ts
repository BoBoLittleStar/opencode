import * as fs from 'fs';
import * as path from 'path';

const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}_${String(date.getMinutes()).padStart(2, '0')}_${String(date.getSeconds()).padStart(2, '0')}`;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

class Logger {
    private readonly baseDir: string;
    private readonly baseName: string;
    private readonly basePath: string;

    constructor(logName: string = 'bobolittlestar-opencode') {
        const configDir = process.env.OPENCODE_CONFIG_DIR || process.cwd();
        this.baseDir = path.join(configDir, 'logs');
        this.baseName = logName;
        this.basePath = path.join(this.baseDir, `${logName}.log`);
    }

    private getNextArchiveIndex(): number {
        if (!fs.existsSync(this.baseDir)) return 1;
        const files = fs.readdirSync(this.baseDir);
        let maxIndex = 0;
        files.forEach(file => {
            const match = file.match(new RegExp(`^${this.baseName}-(\\d+)\\.log$`));
            if (match) {
                const idx = parseInt(match[1], 10);
                if (idx > maxIndex) maxIndex = idx;
            }
        });
        return maxIndex + 1;
    }

    private rotateLog(): void {
        const index = this.getNextArchiveIndex();
        const archivePath = path.join(this.baseDir, `${this.baseName}-${index}.log`);
        fs.renameSync(this.basePath, archivePath);
        this.info(`Log rotated to ${archivePath}`);
    }

    private ensureDir(): void {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, {recursive: true});
        }
    }

    private write(level: string, ...messages: unknown[]): void {
        this.ensureDir();
        const time = format(new Date());
        messages.forEach(message => {
            const logMessage = `[${time}] [${level.toUpperCase()}] ${typeof message === 'object' ? JSON.stringify(message) : message}\n`;
            if (fs.existsSync(this.basePath)) {
                const stats = fs.statSync(this.basePath);
                if (stats.size >= MAX_FILE_SIZE) {
                    this.rotateLog();
                }
            }
            fs.appendFileSync(this.basePath, logMessage);
        });
    }

    debug(...messages: unknown[]): void {
        this.write('debug', ...messages);
    }

    info(...messages: unknown[]): void {
        this.write('info', ...messages);
    }

    warn(...messages: unknown[]): void {
        this.write('warn', ...messages);
    }

    error(...messages: unknown[]): void {
        this.write('error', ...messages);
    }
}

const logger = new Logger();
export const getLogger = () => logger;
