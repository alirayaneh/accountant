import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const manifestPath = path.join(rootDir, 'src/lib/license/gates/manifest.json');
const gatesDir = path.join(rootDir, 'src/lib/license/gates');

function randomExportName() {
  const words = ['sync', 'validate', 'ensure', 'check', 'verify', 'resolve', 'assert', 'guard'];
  const suffix = crypto.randomBytes(3).toString('hex');
  const word = words[crypto.randomInt(words.length)];
  return `_${word}Module${suffix}`;
}

function buildGateFile(exportName) {
  return `import { assertLicenseValid } from '../engine';

export async function ${exportName}(): Promise<void> {
  await assertLicenseValid();
}
`;
}

function updatePageFile(pagePath, oldName, newName) {
  const fullPath = path.join(rootDir, pagePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Page not found: ${pagePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes(oldName)) {
    console.warn(`Symbol ${oldName} not found in ${pagePath}`);
    return;
  }

  fs.writeFileSync(fullPath, content.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName), 'utf8');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

for (const entry of manifest) {
  const previousName = entry.exportName;
  const exportName = randomExportName();

  const gateFile = path.join(gatesDir, `${entry.gate}.ts`);
  fs.writeFileSync(gateFile, buildGateFile(exportName), 'utf8');
  console.log(`Generated ${entry.gate}.ts → ${exportName}()`);

  updatePageFile(entry.page, previousName, exportName);
  entry.exportName = exportName;
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('License gate export names randomized for Electron build.');
