#!/usr/bin/env node
/**
 * Post-build protection for Electron desktop bundles:
 * - strip .next source maps
 * - obfuscate client + server JavaScript shipped with the standalone app
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLIENT_OBFUSCATION_OPTIONS, obfuscateFile } from './obfuscate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const nextDir = path.join(root, '.next');

const SKIP_FILE_NAMES = new Set([
  'interception-route-rewrite-manifest.js',
  'middleware-build-manifest.js',
  'middleware-react-loadable-manifest.js',
  'next-font-manifest.js',
  'server-reference-manifest.js',
]);

const SKIP_FILE_PATTERNS = [
  /^webpack-/,
  /^polyfills-/,
  /^main-app-.*\.js$/,
];

function shouldObfuscateFile(fileName) {
  if (!fileName.endsWith('.js') || fileName.endsWith('.min.js')) {
    return false;
  }
  if (SKIP_FILE_NAMES.has(fileName)) {
    return false;
  }
  return !SKIP_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function removeSourceMaps(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let removed = 0;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      removed += removeSourceMaps(fullPath);
      continue;
    }

    if (!entry.name.endsWith('.map')) {
      continue;
    }

    fs.unlinkSync(fullPath);
    removed += 1;
  }

  return removed;
}

function obfuscateTree(dirPath, options = CLIENT_OBFUSCATION_OPTIONS) {
  if (!fs.existsSync(dirPath)) {
    return { obfuscated: 0, skipped: 0 };
  }

  let obfuscated = 0;
  let skipped = 0;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      const nested = obfuscateTree(fullPath, options);
      obfuscated += nested.obfuscated;
      skipped += nested.skipped;
      continue;
    }

    if (!shouldObfuscateFile(entry.name)) {
      skipped += 1;
      continue;
    }

    try {
      obfuscateFile(fullPath, options);
      obfuscated += 1;
    } catch (error) {
      console.warn(`Skipped ${fullPath}: ${error.message}`);
      skipped += 1;
    }
  }

  return { obfuscated, skipped };
}

function obfuscateSingleFile(filePath, options = CLIENT_OBFUSCATION_OPTIONS) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const fileName = path.basename(filePath);
  if (!shouldObfuscateFile(fileName)) {
    return 0;
  }

  try {
    obfuscateFile(filePath, options);
    return 1;
  } catch (error) {
    console.warn(`Skipped ${filePath}: ${error.message}`);
    return 0;
  }
}

const targets = [
  { label: 'client chunks', path: path.join(nextDir, 'static', 'chunks') },
  { label: 'server bundles', path: path.join(nextDir, 'server') },
  { label: 'standalone client chunks', path: path.join(nextDir, 'standalone', '.next', 'static', 'chunks') },
  { label: 'standalone server bundles', path: path.join(nextDir, 'standalone', '.next', 'server') },
];

const singleFiles = [
  { label: 'standalone server entry', path: path.join(nextDir, 'standalone', 'server.js') },
];

const removedMaps = removeSourceMaps(nextDir);
console.log(`Removed ${removedMaps} source map file(s) from .next`);

let totalObfuscated = 0;
let totalSkipped = 0;

for (const target of targets) {
  const result = obfuscateTree(target.path);
  totalObfuscated += result.obfuscated;
  totalSkipped += result.skipped;
  console.log(`Obfuscated ${result.obfuscated} file(s) in ${target.label} (skipped ${result.skipped})`);
}

for (const file of singleFiles) {
  const count = obfuscateSingleFile(file.path);
  totalObfuscated += count;
  if (count > 0) {
    console.log(`Obfuscated ${file.label}`);
  }
}

console.log(`Electron Next.js protection complete: ${totalObfuscated} file(s) obfuscated, ${totalSkipped} skipped.`);
