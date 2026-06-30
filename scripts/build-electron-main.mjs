import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { obfuscateFile } from './obfuscate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'electron', 'main.cjs');
const outDir = path.join(root, 'electron-dist');
const output = path.join(outDir, 'main.cjs');

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(source, output);
obfuscateFile(output);
console.log('Protected Electron main process build complete.');
