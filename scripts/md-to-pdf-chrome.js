#!/usr/bin/env node
/**
 * Converts amoza-accountant-guide-fa.md to PDF via HTML + Chrome headless.
 */
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');
const { tmpdir } = require('os');

const ROOT = join(__dirname, '..');
const GUIDE_DIR = join(ROOT, 'docs', 'user-guide');
const MD_PATH = join(GUIDE_DIR, 'amoza-accountant-guide-fa.md');
const CSS_PATH = join(GUIDE_DIR, 'pdf-rtl.css');
const PDF_PATH = join(GUIDE_DIR, 'amoza-accountant-guide-fa.pdf');

function stripFrontmatter(content) {
  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) return content.slice(end + 3).trim();
  }
  return content;
}

function resolveImages(html, baseDir) {
  return html.replace(/src="assets\//g, `src="file://${baseDir}/assets/`);
}

function findChrome() {
  for (const bin of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      execSync(`which ${bin}`, { stdio: 'ignore' });
      return bin;
    } catch {
      /* try next */
    }
  }
  throw new Error('Chrome/Chromium not found');
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'amoza-pdf-'));
  try {
    execSync('npm init -y && npm install marked@9', { cwd: tmp, stdio: 'pipe' });
    const { marked } = require(join(tmp, 'node_modules', 'marked'));

    let md = readFileSync(MD_PATH, 'utf8');
    md = stripFrontmatter(md);
    md = md.replace(/<div dir="rtl">\s*/g, '').replace(/\s*<\/div>\s*$/g, '');

    let body = marked.parse(md);
    body = resolveImages(body, GUIDE_DIR);

    const css = readFileSync(CSS_PATH, 'utf8');
    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>${body}</body>
</html>`;

    const htmlPath = join(GUIDE_DIR, '_guide-print.html');
    writeFileSync(htmlPath, html, 'utf8');

    const chrome = findChrome();
    execSync(
      `"${chrome}" --headless=new --disable-gpu --no-sandbox --print-to-pdf="${PDF_PATH}" "file://${htmlPath}"`,
      { stdio: 'inherit' }
    );

    console.log(`PDF generated: ${PDF_PATH}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
