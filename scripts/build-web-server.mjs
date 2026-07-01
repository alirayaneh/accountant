#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_DEPLOYMENT_MODE: 'server',
    NEXT_PUBLIC_ALLOWED_STORAGE_TYPES: 'online',
  },
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
