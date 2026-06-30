import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const removed = removeSourceMaps(nextDir);
console.log(`Removed ${removed} source map file(s) from .next`);
