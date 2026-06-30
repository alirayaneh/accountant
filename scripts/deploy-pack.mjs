#!/usr/bin/env node
/**
 * Assembles server deployment artifacts into deploy-staging/
 * Run from repo root after checkout on the `server` branch.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = process.env.DEPLOY_OUT_DIR || path.join(root, 'deploy-staging');
const skipBuild = process.argv.includes('--no-build');

function run(command, options = {}) {
  execSync(command, { cwd: root, stdio: 'inherit', ...options });
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing build output: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function gitValue(args) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function loadBuildEnv() {
  const env = { ...process.env, NODE_ENV: 'production' };
  const serverEnvPath = path.join(root, '.env.server');

  if (fs.existsSync(serverEnvPath)) {
    const lines = fs.readFileSync(serverEnvPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key.startsWith('NEXT_PUBLIC_') && !process.env[key]) {
        env[key] = value;
      }
    }
  }

  return env;
}

if (!skipBuild) {
  console.log('>> Installing dependencies...');
  run('npm ci');
  run('npm ci', { cwd: path.join(root, 'backend') });

  console.log('>> Building server frontend (build:web:server)...');
  run('npm run build:web:server', { env: loadBuildEnv() });

  console.log('>> Building backend (build:backend)...');
  run('npm run build:backend');
} else {
  console.log('>> Skipping build (--no-build)');
}

const standaloneSrc = path.join(root, '.next/standalone');
const staticSrc = path.join(root, '.next/static');
const publicSrc = path.join(root, 'public');
const backendDistSrc = path.join(root, 'backend/dist');

console.log('>> Assembling deploy package...');
rmrf(outDir);
fs.mkdirSync(outDir, { recursive: true });

copyDir(backendDistSrc, path.join(outDir, 'backend/dist'));
fs.copyFileSync(
  path.join(root, 'backend/package.json'),
  path.join(outDir, 'backend/package.json'),
);
fs.copyFileSync(
  path.join(root, 'backend/package-lock.json'),
  path.join(outDir, 'backend/package-lock.json'),
);

const standaloneDest = path.join(outDir, '.next/standalone');
copyDir(standaloneSrc, standaloneDest);
copyDir(staticSrc, path.join(standaloneDest, '.next/static'));
copyDir(publicSrc, path.join(standaloneDest, 'public'));
copyDir(staticSrc, path.join(outDir, '.next/static'));
copyDir(publicSrc, path.join(outDir, 'public'));

const nextRuntime = path.join(standaloneDest, 'node_modules/next/package.json');
if (!fs.existsSync(nextRuntime)) {
  throw new Error(
    'Standalone build is missing node_modules/next. Run npm run build:web:server first.',
  );
}

const templatesDir = path.join(root, 'deploy-templates');
if (fs.existsSync(templatesDir)) {
  for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
    const src = path.join(templatesDir, entry.name);
    const dest = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
    if (entry.name.endsWith('.sh')) {
      fs.chmodSync(dest, 0o755);
    }
  }
}

fs.mkdirSync(path.join(outDir, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'backend/uploads'), { recursive: true });
for (const uploadsDir of ['uploads', 'backend/uploads']) {
  const keep = path.join(outDir, uploadsDir, '.gitkeep');
  if (!fs.existsSync(keep)) {
    fs.writeFileSync(keep, '');
  }
}

const deployInfo = {
  builtAt: new Date().toISOString(),
  commit: gitValue('rev-parse HEAD'),
  branch: gitValue('rev-parse --abbrev-ref HEAD'),
  nodeVersion: process.version,
  packageVersion: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
};

fs.writeFileSync(
  path.join(outDir, 'deploy-info.json'),
  `${JSON.stringify(deployInfo, null, 2)}\n`,
);

console.log(`>> Deploy package ready: ${outDir}`);
console.log(JSON.stringify(deployInfo, null, 2));
