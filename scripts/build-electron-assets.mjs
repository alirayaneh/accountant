#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(scriptName) {
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DESKTOP_FAST_BUILD: 'true',
    },
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('generate:electron:icons');
run('build:backend');
run('build:web:electron');
run('build:electron:main');
run('rebuild:electron:natives');
