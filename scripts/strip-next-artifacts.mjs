import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { obfuscateFile } from './obfuscate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextDir = path.join(__dirname, '..', '.next');

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

function obfuscateLicenseChunks(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let obfuscated = 0;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      obfuscated += obfuscateLicenseChunks(fullPath);
      continue;
    }

    if (!entry.name.endsWith('.js') || entry.name.endsWith('.min.js')) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const isLicenseChunk =
      content.includes('assertLicenseValid') ||
      content.includes('license/status') ||
      content.includes('/api/license');

    if (!isLicenseChunk) {
      continue;
    }

    obfuscateFile(fullPath);
    obfuscated += 1;
  }

  return obfuscated;
}

const removed = removeSourceMaps(nextDir);
console.log(`Removed ${removed} source map file(s) from .next`);

const obfuscated = obfuscateLicenseChunks(nextDir);
console.log(`Obfuscated ${obfuscated} license-related chunk(s) in .next`);
