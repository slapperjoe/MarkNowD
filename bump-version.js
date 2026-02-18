import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, 'package.json');
const tauriConfPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');

// Helper to read JSON
function readJson(filePath) {
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
}

// Helper to write JSON
function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function bumpVersion() {
    console.log('Bumping patch version...');

    const packageJson = readJson(packageJsonPath);
    const tauriConf = readJson(tauriConfPath);

    if (!packageJson || !tauriConf) {
        console.error('Could not find package.json or tauri.conf.json');
        process.exit(1);
    }

    // Parse version
    const versionParts = packageJson.version.split('.').map(Number);
    if (versionParts.length !== 3) {
        console.error('Invalid version format in package.json. Expected x.y.z');
        process.exit(1);
    }

    // Increment patch
    versionParts[2]++;
    const newVersion = versionParts.join('.');

    // Update package.json
    packageJson.version = newVersion;
    writeJson(packageJsonPath, packageJson);
    console.log(`Updated package.json to version ${newVersion}`);

    // Update tauri.conf.json
    tauriConf.version = newVersion;
    writeJson(tauriConfPath, tauriConf);
    console.log(`Updated tauri.conf.json to version ${newVersion}`);
}

bumpVersion();
