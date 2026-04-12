import fs from 'fs';
import path from 'path';

const rootDir = path.join(__dirname, '..');

function cleanJsWithTsSource(dir: string): void {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
                cleanJsWithTsSource(fullPath);
            }
        } else if (entry.isFile()) {
            if (entry.name.endsWith('.js')) {
                const tsPath = fullPath.replace(/\.js$/, '.ts');
                if (fs.existsSync(tsPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }
    }
}

const dirsToClean = ['libs/dist', 'tools/dist', 'mcps/dist', 'plugins/dist', '.tsbuild'];

for (const dir of dirsToClean) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true });
    }
}

const srcDirs = ['libs/src', 'tools/src', 'plugins/src', 'mcps/src'];
for (const dir of srcDirs) {
    cleanJsWithTsSource(path.join(rootDir, dir));
}