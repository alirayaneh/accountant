import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { obfuscateFile } from './obfuscate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..', 'backend');
const distDir = path.join(backendRoot, 'dist');
const outfile = path.join(distDir, 'server.js');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(backendRoot, 'src', 'server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile,
  format: 'cjs',
  packages: 'external',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
});

obfuscateFile(outfile);
console.log('Protected backend build complete.');
