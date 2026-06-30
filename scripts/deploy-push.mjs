#!/usr/bin/env node
/**
 * Builds server artifacts and pushes them to the deploy repository.
 *
 * Env:
 *   DEPLOY_REPO   default: git@github.com:alirayaneh/accountant_deploy.git
 *   DEPLOY_BRANCH default: main
 *   DEPLOY_WORK_DIR default: .deploy-work
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const deployRepo = process.env.DEPLOY_REPO || 'git@github.com:alirayaneh/accountant_deploy.git';
const deployBranch = process.env.DEPLOY_BRANCH || 'main';
const workDir = process.env.DEPLOY_WORK_DIR || path.join(root, '.deploy-work');
const stagingDir = process.env.DEPLOY_OUT_DIR || path.join(root, 'deploy-staging');

const skipBuild = process.argv.includes('--no-build');
const dryRun = process.argv.includes('--dry-run');

function run(command, options = {}) {
  return execSync(command, {
    cwd: options.cwd || root,
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  });
}

function runCapture(command, options = {}) {
  return execSync(command, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  }).trim();
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyContents(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (entry === '.git') continue;
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    fs.cpSync(from, to, { recursive: true, force: true });
  }
}

function ensureCleanDeployRepo() {
  if (fs.existsSync(path.join(workDir, '.git'))) {
    console.log(`>> Updating deploy workdir: ${workDir}`);
    run(`git fetch origin ${deployBranch}`, { cwd: workDir });
    run(`git checkout ${deployBranch}`, { cwd: workDir });
    run(`git reset --hard origin/${deployBranch}`, { cwd: workDir });
    return;
  }

  rmrf(workDir);
  fs.mkdirSync(path.dirname(workDir), { recursive: true });
  console.log(`>> Cloning deploy repo into ${workDir}`);

  try {
    run(`git clone --branch ${deployBranch} --single-branch ${deployRepo} ${workDir}`);
  } catch {
    console.log('>> Deploy branch missing — initializing empty repo');
    fs.mkdirSync(workDir, { recursive: true });
    run('git init', { cwd: workDir });
    run(`git checkout -b ${deployBranch}`, { cwd: workDir });
    run(`git remote add origin ${deployRepo}`, { cwd: workDir });
  }
}

if (!skipBuild) {
  run(`node scripts/deploy-pack.mjs`, { cwd: root });
} else {
  run(`node scripts/deploy-pack.mjs --no-build`, { cwd: root });
}

if (!fs.existsSync(stagingDir)) {
  throw new Error(`Staging directory not found: ${stagingDir}`);
}

ensureCleanDeployRepo();

function ensureGitIdentity(cwd) {
  try {
    runCapture('git config user.email', { cwd });
  } catch {
    run('git config user.email "github-actions[bot]@users.noreply.github.com"', { cwd });
    run('git config user.name "github-actions[bot]"', { cwd });
  }
}

ensureGitIdentity(workDir);

console.log('>> Copying staged artifacts into deploy repo...');
for (const entry of fs.readdirSync(workDir)) {
  if (entry === '.git') continue;
  rmrf(path.join(workDir, entry));
}
copyContents(stagingDir, workDir);

const deployInfo = JSON.parse(fs.readFileSync(path.join(workDir, 'deploy-info.json'), 'utf8'));
const commitMessage = `Deploy ${deployInfo.packageVersion} (${deployInfo.commit.slice(0, 7)})`;

run('git add -A', { cwd: workDir });
run('git add -f .next/standalone/node_modules', { cwd: workDir });

let hasChanges = true;
try {
  runCapture(`git diff --cached --quiet`, { cwd: workDir });
  hasChanges = false;
} catch {
  hasChanges = true;
}

if (!hasChanges) {
  console.log('>> No changes to deploy — skipping push.');
  process.exit(0);
}

run(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: workDir });

if (dryRun) {
  console.log('>> Dry run — commit created locally, push skipped.');
  process.exit(0);
}

const sshCommand = process.env.GIT_SSH_COMMAND;
const pushEnv = sshCommand ? { GIT_SSH_COMMAND: sshCommand } : {};

console.log(`>> Pushing to ${deployRepo} (${deployBranch})...`);
try {
  run(`git push origin ${deployBranch}`, { cwd: workDir, env: pushEnv });
} catch {
  run(`git push -u origin ${deployBranch}`, { cwd: workDir, env: pushEnv });
}

console.log('>> Deploy push complete.');
