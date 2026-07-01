#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [path.join(root, 'scripts', 'generate-license-gates.mjs')]);

const electronEnv = {
  NEXT_PUBLIC_IS_ELECTRON: 'true',
  NEXT_PUBLIC_API_URL: 'https://hesab.amoza.ir',
  NEXT_PUBLIC_ALLOWED_STORAGE_TYPES: 'sqlite,online',
  NEXT_PUBLIC_LOCAL_API_URL: 'http://127.0.0.1:43031',
};

run(process.execPath, [nextBin, 'build'], electronEnv);
