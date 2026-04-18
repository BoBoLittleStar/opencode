import * as fs from "fs";
import * as os from "node:os";
import * as path from "path";

const format = (time: Date) => {
    const year = time.getFullYear();
    let month = String(time.getMonth() + 1).padStart(2, "0");
    let date = String(time.getDate()).padStart(2, "0");
    let hours = String(time.getHours()).padStart(2, "0");
    let minutes = String(time.getMinutes()).padStart(2, "0");
    let seconds = String(time.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

class Logger {
    private readonly baseDir: string;
    private readonly baseName: string;
    private readonly basePath: string;

    constructor(logName: string = "bobolittlestar-opencode") {
        const configDir = process.env.OPENCODE_CONFIG_DIR || process.cwd();
        this.baseDir = path.join(configDir, "logs");
        this.baseName = logName;
        this.basePath = path.join(this.baseDir, `${logName}.log`);
    }

    private getNextArchiveIndex(): number {
        if (!fs.existsSync(this.baseDir)) return 1;
        const files = fs.readdirSync(this.baseDir);
        let maxIndex = 0;
        files.forEach((file) => {
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
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    private getFrom(): string {
        const stack = new Error().stack;
        if (stack) {
            const from = stack
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.startsWith("at") && !line.includes("logger"))
                .map((line) => /.*\((.*):\d+:\d+\)/.exec(line)?.[1]);
            if (from?.length && from[0]) {
                return from[0].replaceAll(process.env.OPENCODE_CONFIG_DIR!, "").replaceAll("\\", "/");
            }
        }
        return "null";
    }

    private write(level: string, ...messages: unknown[]): void {
        this.ensureDir();
        const from = this.getFrom();
        const time = format(new Date());
        const message = messages
            .map((message) => `${typeof message === "object" ? JSON.stringify(message) : message}`)
            .join(os.EOL);
        if (fs.existsSync(this.basePath)) {
            const stats = fs.statSync(this.basePath);
            if (stats.size >= MAX_FILE_SIZE) {
                this.rotateLog();
            }
        }
        fs.appendFileSync(this.basePath, `[${time}] [${level.toUpperCase()}] ${from} - ${message}${os.EOL}`);
    }

    debug(...messages: unknown[]): void {
        this.write("debug", ...messages);
    }

    info(...messages: unknown[]): void {
        this.write("info", ...messages);
    }

    warn(...messages: unknown[]): void {
        this.write("warn", ...messages);
    }

    error(...messages: unknown[]): void {
        this.write("error", ...messages);
    }
}

const logger = new Logger();
export const getLogger = () => logger;
