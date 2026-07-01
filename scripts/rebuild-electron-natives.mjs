#!/usr/bin/env node
/**
 * Rebuild native Node modules for Electron's embedded Node ABI.
 * Required because the backend runs under ELECTRON_RUN_AS_NODE in production.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = path.join(root, 'backend');
const sqlite3Dir = path.join(backendRoot, 'node_modules', 'sqlite3');

function readElectronVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const version = pkg.devDependencies?.electron || pkg.dependencies?.electron;
  if (!version) {
    throw new Error('Electron version not found in root package.json');
  }
  return version.replace(/^[\^~]/, '');
}

if (!fs.existsSync(sqlite3Dir)) {
  console.error('sqlite3 not found. Run: cd backend && npm install');
  process.exit(1);
}

const electronVersion = readElectronVersion();
console.log(`Rebuilding sqlite3 for Electron ${electronVersion} (${process.platform}-${process.arch})...`);

const rebuildBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-rebuild.cmd' : 'electron-rebuild',
);

const result = spawnSync(
  rebuildBin,
  ['-f', '-w', 'sqlite3', '-v', electronVersion, '-m', backendRoot],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);

if (result.status !== 0) {
  console.error('electron-rebuild failed');
  process.exit(result.status ?? 1);
}

console.log('Native modules rebuilt for Electron.');
