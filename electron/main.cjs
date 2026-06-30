const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_PORT = '43031';

const children = [];
let logFilePath = null;

function log(message, error) {
  const line = `[${new Date().toISOString()}] ${message}${error ? `\n${error.stack || error.message || error}` : ''}\n`;

  if (!app.isPackaged) {
    process.stderr.write(line);
  }

  if (logFilePath) {
    fs.appendFileSync(logFilePath, line);
  }
}

function getResourcePath(...parts) {
  const basePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  return path.join(basePath, ...parts);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function spawnNodeScript(scriptPath, options = {}) {
  log(`Starting ${scriptPath}`);

  const child = spawn(process.execPath, [scriptPath], {
    cwd: options.cwd || path.dirname(scriptPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      ...options.env,
    },
    stdio: app.isPackaged ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: true,
  });

  if (app.isPackaged) {
    child.stdout?.on('data', (chunk) => log(`${path.basename(scriptPath)} stdout: ${chunk.toString().trimEnd()}`));
    child.stderr?.on('data', (chunk) => log(`${path.basename(scriptPath)} stderr: ${chunk.toString().trimEnd()}`));
  }

  child.on('exit', (code, signal) => {
    log(`${scriptPath} exited with code ${code} signal ${signal}`);
  });

  children.push(child);
  return child;
}

function waitForUrl(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const response = await fetch(url);
        if (response.ok || response.status < 500) {
          resolve();
          return;
        }
      } catch (_) {
        // The local server is still starting.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(check, 500);
    };

    check();
  });
}

async function startServers() {
  const userDataPath = app.getPath('userData');
  const uploadDir = path.join(userDataPath, 'uploads');
  ensureDir(uploadDir);

  const backendScript = getResourcePath('backend', 'dist', 'server.js');
  const frontendDir = getResourcePath('next');

  if (!fs.existsSync(backendScript) || !fs.existsSync(path.join(frontendDir, 'server.js'))) {
    throw new Error('Electron build assets are missing. Run npm run build:electron:assets first.');
  }

  spawnNodeScript(backendScript, {
    cwd: getResourcePath('backend'),
    env: {
      PORT: APP_PORT,
      HOST: '127.0.0.1',
      FRONTEND_URL: `http://127.0.0.1:${APP_PORT}`,
      DB_TYPE: 'sqlite',
      SQLITE_PATH: path.join(userDataPath, 'database.sqlite'),
      UPLOAD_DIR: uploadDir,
      SESSION_SECRET: 'easystock-electron-local-session',
      SERVE_FRONTEND: 'true',
      FRONTEND_DIR: frontendDir,
      NEXT_PUBLIC_LOCAL_API_URL: `http://127.0.0.1:${APP_PORT}`,
    },
  });

  await waitForUrl(`http://127.0.0.1:${APP_PORT}/health`);
  await waitForUrl(`http://127.0.0.1:${APP_PORT}`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'EasyStock Accountant',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(`http://127.0.0.1:${APP_PORT}`);
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

app.whenReady().then(async () => {
  logFilePath = path.join(app.getPath('userData'), 'startup.log');
  log('App starting');

  try {
    await startServers();
    createWindow();
  } catch (error) {
    dialog.showErrorBox('Startup failed', error.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopChildren();
  app.quit();
});

app.on('before-quit', stopChildren);
