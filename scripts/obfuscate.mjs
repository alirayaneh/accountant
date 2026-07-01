import fs from 'fs';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';

export const NODE_OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

/** Slightly lighter settings for browser / Next.js chunks (webpack compatibility). */
export const CLIENT_OBFUSCATION_OPTIONS = {
  ...NODE_OBFUSCATION_OPTIONS,
  controlFlowFlatteningThreshold: 0.25,
  stringArrayThreshold: 0.6,
  stringArrayEncoding: ['rc4'],
  transformObjectKeys: false,
};

export function obfuscateCode(source, options = NODE_OBFUSCATION_OPTIONS) {
  return JavaScriptObfuscator.obfuscate(source, options).getObfuscatedCode();
}

export function obfuscateFile(filePath, options = NODE_OBFUSCATION_OPTIONS) {
  const source = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, obfuscateCode(source, options), 'utf8');
  console.log(`Obfuscated: ${filePath}`);
}

export function obfuscateJsFiles(dirPath, options = NODE_OBFUSCATION_OPTIONS) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let count = 0;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      count += obfuscateJsFiles(fullPath, options);
      continue;
    }

    if (!entry.name.endsWith('.js') || entry.name.endsWith('.min.js')) {
      continue;
    }

    obfuscateFile(fullPath, options);
    count += 1;
  }

  return count;
}
