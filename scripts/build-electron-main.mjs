import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { obfuscateFile } from './obfuscate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'electron-dist');
const electronFiles = ['main.cjs', 'offline-storage.cjs', 'preload.cjs'];
const electronAssets = [
  ['electron/splash.html', 'splash.html'],
  ['electron/assets/splash.png', 'splash.png'],
  ['electron/assets/icon.png', 'icon.png'],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [sourceRel, destName] of electronAssets) {
  const source = path.join(root, sourceRel);
  const output = path.join(outDir, destName);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing Electron asset: ${sourceRel}`);
  }
  fs.copyFileSync(source, output);
}

for (const file of electronFiles) {
  const source = path.join(root, 'electron', file);
  const output = path.join(outDir, file);
  fs.copyFileSync(source, output);
  if (file === 'main.cjs') {
    obfuscateFile(output);
  }
}

console.log('Protected Electron main process build complete.');
