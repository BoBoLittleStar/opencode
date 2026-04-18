import fs from "fs";
import path from "path";

const rootDir = path.join(__dirname, "..");

const dirsToClean = ["plugins/dist"];

for (const dir of dirsToClean) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true });
    }
}
