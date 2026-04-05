const fs = require('fs');
const path = require('path');

// Script is in plugins/ directory
const scriptDir = path.dirname(path.resolve(__filename));
const baseDir = scriptDir;  // plugins directory
const srcDir = path.join(baseDir, 'src');
const distDir = path.join(baseDir, 'dist');

function copyPyFiles(dir) {
    fs.readdirSync(dir, {withFileTypes: true}).forEach((entry) => {
        // Skip __pycache__ directories
        if (entry.name === '__pycache__') return;

        const srcPath = path.join(dir, entry.name);
        const distPath = srcPath.replace(srcDir, distDir);

        if (entry.isDirectory()) {
            if (!fs.existsSync(distPath)) {
                fs.mkdirSync(distPath, {recursive: true});
            }
            copyPyFiles(srcPath);
        } else if (entry.name.endsWith('.py')) {
            const distDirPath = path.dirname(distPath);
            if (!fs.existsSync(distDirPath)) {
                fs.mkdirSync(distDirPath, {recursive: true});
            }
            fs.copyFileSync(srcPath, distPath);
        }
    });
}

copyPyFiles(srcDir);
