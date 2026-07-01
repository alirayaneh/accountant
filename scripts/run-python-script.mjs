#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptName = process.argv[2];
if (!scriptName) {
  console.error('Usage: node scripts/run-python-script.mjs <script.py>');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(root, 'scripts', scriptName);
const python = process.platform === 'win32' ? 'python' : 'python3';

const result = spawnSync(python, [scriptPath], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
