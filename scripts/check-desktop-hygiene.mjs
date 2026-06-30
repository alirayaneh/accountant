#!/usr/bin/env node
/**
 * Fails if server-only license issuer files exist (desktop/main branch guard).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const forbidden = [
  'backend/src/services/license-key.service.ts',
  'backend/src/routes/license-issuer.ts',
  'backend/src/models/License.ts',
  'backend/src/models/LicenseActivation.ts',
];

const found = forbidden.filter((rel) => fs.existsSync(path.join(root, rel)));

if (found.length > 0) {
  console.error('Desktop branch must not contain license issuer files:');
  for (const file of found) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

console.log('Desktop branch hygiene check passed (no license issuer files).');
