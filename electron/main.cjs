const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createOfflineStorageManager } = require('./offline-storage.cjs');

const APP_PORT = '43031';

const children = [];
let logFilePath = null;
let storageManager = null;
let mainWindow = null;
let splashWindow = null;
let startupT0 = Date.now();

function startupMs() {
  return Date.now() - startupT0;
}

const SPLASH_WIDTH = 960;
const SPLASH_HEIGHT = 536;

function log(message, error) {
  const line = `[${new Date().toISOString()}] ${message}${error ? `\n${error.stack || error.message || error}` : ''}\n`;

  if (!app.isPackaged) {
    process.stderr.write(line);
  }

  if (logFilePath) {
    fs.appendFileSync(logFilePath, line);
  }
}

function getStorageManager() {
  if (!storageManager) {
    storageManager = createOfflineStorageManager(app.getPath('userData'), {
      forbiddenRoots: getForbiddenDataRoots(),
    });
  }
  return storageManager;
}

function getForbiddenDataRoots() {
  const roots = [
    app.getPath('userData'),
    getResourcePath(),
    path.dirname(app.getPath('exe')),
  ];

  if (!app.isPackaged) {
    roots.push(path.join(__dirname, '..'));
  }

  return roots.map((root) => path.resolve(root));
}

function getResourcePath(...parts) {
  const basePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  return path.join(basePath, ...parts);
}

function getPreloadPath() {
  return path.join(__dirname, 'preload.cjs');
}

function getWindowIconPath() {
  return path.join(__dirname, 'icon.png');
}

function getSplashHtmlPath() {
  return path.join(__dirname, 'splash.html');
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

function createSplashWindow() {
  if (!fs.existsSync(getSplashHtmlPath())) {
    return;
  }

  splashWindow = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    frame: false,
    center: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#121212',
    icon: fs.existsSync(getWindowIconPath()) ? getWindowIconPath() : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splashWindow.loadFile(getSplashHtmlPath());
  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function spawnNodeScript(scriptPath, options = {}) {
  log(`Starting ${scriptPath}`);

  const stderrChunks = [];
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
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderrChunks.push(text);
      log(`${path.basename(scriptPath)} stderr: ${text.trimEnd()}`);
    });
  }

  child.on('exit', (code, signal) => {
    log(`${scriptPath} exited with code ${code} signal ${signal}`);
  });

  child.stderrChunks = stderrChunks;
  children.push(child);
  return child;
}

function waitForUrl(url, timeoutMs = 60000, child = null) {
  const startedAt = Date.now();
  let childExitError = null;

  if (child) {
    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        const stderr = (child.stderrChunks || []).join('').trim();
        childExitError = new Error(
          `Backend process exited with code ${code}${signal ? ` (${signal})` : ''}${stderr ? `:\n${stderr.slice(-2000)}` : ''}`,
        );
      }
    });
  }

  return new Promise((resolve, reject) => {
    const check = async () => {
      if (childExitError) {
        reject(childExitError);
        return;
      }

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
        const stderr = child ? (child.stderrChunks || []).join('').trim() : '';
        const details = stderr ? `\n\nBackend stderr:\n${stderr.slice(-2000)}` : '';
        reject(new Error(`Timed out waiting for ${url}${details}`));
        return;
      }

      setTimeout(check, 500);
    };

    check();
  });
}

function getMachineId(userDataPath) {
  const seed = `${userDataPath}:${os.hostname()}:${os.platform()}:${os.arch()}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

async function pickCustomStorageFolder() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'انتخاب محل ذخیره‌سازی آفلاین (الزامی)',
    message: 'پوشه‌ای خارج از محل نصب برنامه انتخاب کنید.',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

async function ensureCustomStorageFolder() {
  const manager = getStorageManager();
  if (!manager.requiresCustomDataDir()) {
    return true;
  }

  while (true) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['انتخاب پوشه', 'خروج از برنامه'],
      defaultId: 0,
      cancelId: 1,
      title: 'انتخاب محل ذخیره‌سازی آفلاین',
      message: 'برای استفاده از حالت آفلاین، انتخاب پوشه ذخیره‌سازی الزامی است.',
      detail: 'دیتابیس و فایل‌های آپلود باید در پوشه‌ای خارج از محل نصب برنامه ذخیره شوند تا با نصب نسخه جدید، داده‌های شما جایگزین نشوند.',
    });

    if (response !== 0) {
      return false;
    }

    const folderPath = await pickCustomStorageFolder();
    if (!folderPath) {
      continue;
    }

    if (!manager.isAllowedCustomDataDir(folderPath)) {
      await dialog.showMessageBox({
        type: 'error',
        buttons: ['تلاش مجدد'],
        title: 'پوشه نامعتبر',
        message: 'پوشه انتخاب‌شده مجاز نیست.',
        detail: 'محل ذخیره‌سازی نباید داخل پوشه نصب برنامه یا پوشه‌های داخلی آن باشد. لطفاً پوشه‌ای در درایو یا مسیر دیگری انتخاب کنید.',
      });
      continue;
    }

    try {
      manager.applyCustomDataDir(folderPath);
      return true;
    } catch (error) {
      dialog.showErrorBox('خطا در تنظیم محل ذخیره‌سازی', error.message);
    }
  }
}

async function handleMissingDatabase(validation) {
  const { response } = await dialog.showMessageBox({
    type: 'error',
    buttons: ['بازیابی از پشتیبان', 'خروج'],
    defaultId: 0,
    cancelId: 1,
    title: 'دیتابیس یافت نشد',
    message: 'فایل دیتابیس در محل ذخیره‌سازی یافت نشد.',
    detail: validation.hasBackup
      ? 'آیا می‌خواهید آخرین نسخه پشتیبان به این محل کپی شود؟'
      : 'نسخه پشتیبان موجود نیست. برنامه بسته می‌شود.',
  });

  if (response !== 0 || !validation.hasBackup) {
    return false;
  }

  getStorageManager().restoreFromBackup(validation.activeDir);
  return true;
}

async function ensureDatabaseReady() {
  const manager = getStorageManager();

  if (manager.requiresCustomDataDir()) {
    return false;
  }

  const validation = manager.validateActiveDatabase();

  if (validation.ok) {
    return true;
  }

  if (!validation.missingDb) {
    return true;
  }

  if (!validation.hasBackup) {
    return true;
  }

  return handleMissingDatabase(validation);
}

async function startServers() {
  const userDataPath = app.getPath('userData');
  const manager = getStorageManager();
  const activeDir = manager.getActiveDataDir();

  if (!activeDir) {
    throw new Error('محل ذخیره‌سازی آفلاین هنوز تنظیم نشده است.');
  }

  const paths = manager.getPaths(activeDir);
  const machineId = getMachineId(userDataPath);

  ensureDir(paths.uploadDir);

  const backendScript = getResourcePath('backend', 'dist', 'server.js');
  const staticDir = getResourcePath('static');

  if (!fs.existsSync(backendScript) || !fs.existsSync(path.join(staticDir, 'index.html'))) {
    throw new Error('Electron build assets are missing. Run npm run build:electron:assets first.');
  }

  const requireExistingDb = manager.shouldRequireExistingDatabase();

  const backendChild = spawnNodeScript(backendScript, {
    cwd: getResourcePath('backend'),
    env: {
      PORT: APP_PORT,
      HOST: '127.0.0.1',
      FRONTEND_URL: `http://127.0.0.1:${APP_PORT}`,
      DB_TYPE: 'sqlite',
      SQLITE_PATH: paths.dbPath,
      UPLOAD_DIR: paths.uploadDir,
      SQLITE_REQUIRE_EXISTS: requireExistingDb ? 'true' : 'false',
      SESSION_SECRET: 'easystock-electron-local-session',
      SERVE_STATIC: 'true',
      STATIC_DIR: staticDir,
      NEXT_PUBLIC_LOCAL_API_URL: `http://127.0.0.1:${APP_PORT}`,
      LICENSE_ENABLED: 'true',
      LICENSE_SERVER_URL: process.env.LICENSE_SERVER_URL || 'https://license.yourdomain.com/api/v1',
      LICENSE_PRODUCT_ID: process.env.LICENSE_PRODUCT_ID || 'easystock-accountant',
      MACHINE_ID: machineId,
      APP_VERSION: app.getVersion(),
    },
  });

  await waitForUrl(`http://127.0.0.1:${APP_PORT}/health`, 60000, backendChild);
  log(`timing: backend health ok +${startupMs()}ms`);
}

function scheduleBackupInBackground() {
  setImmediate(() => {
    try {
      const manager = getStorageManager();
      const activeDir = manager.getActiveDataDir();
      if (!activeDir) {
        return;
      }
      const paths = manager.getPaths(activeDir);
      if (fs.existsSync(paths.dbPath)) {
        manager.updateBackupFromActive();
        log(`timing: background backup finished +${startupMs()}ms`);
      }
    } catch (error) {
      log('Background backup failed', error);
    }
  });
}

function stopChildren() {
  while (children.length > 0) {
    const child = children.pop();
    if (child && !child.killed) {
      child.kill();
    }
  }
}

async function restartServers(options = {}) {
  stopChildren();
  await startServers();
  if (options.reloadWindow && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'EasyStock Accountant',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    show: false,
    icon: fs.existsSync(getWindowIconPath()) ? getWindowIconPath() : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: getPreloadPath(),
    },
  });

  mainWindow = win;
  win.once('ready-to-show', () => {
    log(`timing: window ready-to-show +${startupMs()}ms`);
    closeSplashWindow();
    if (!win.isDestroyed()) {
      win.show();
    }
  });
  win.loadURL(`http://127.0.0.1:${APP_PORT}`);
}

function registerIpcHandlers() {
  ipcMain.handle('offline-storage:get-info', () => {
    const manager = getStorageManager();
    const validation = manager.validateActiveDatabase();
    return {
      ...validation,
      config: manager.loadConfig(),
    };
  });

  ipcMain.handle('offline-storage:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'انتخاب محل ذخیره‌سازی آفلاین',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('offline-storage:apply-folder', async (_event, folderPath) => {
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('مسیر پوشه نامعتبر است.');
    }

    const manager = getStorageManager();
    if (!manager.isAllowedCustomDataDir(folderPath)) {
      throw new Error(
        'پوشه انتخاب‌شده مجاز نیست. محل ذخیره‌سازی باید خارج از پوشه نصب برنامه و پوشه‌های داخلی آن باشد.'
      );
    }

    const paths = manager.applyCustomDataDir(folderPath);
    await restartServers();
    return {
      activeDir: paths.dataDir,
      dbPath: paths.dbPath,
      uploadDir: paths.uploadDir,
    };
  });

  ipcMain.handle('offline-storage:set-storage-type', async (_event, storageType) => {
    const manager = getStorageManager();
    const current = manager.loadConfig().storageType;
    const next = storageType === 'online' ? 'online' : 'sqlite';

    if (current === next) {
      return manager.validateActiveDatabase();
    }

    manager.saveStorageType(next);
    if (!manager.requiresCustomDataDir()) {
      await restartServers();
    }
    return manager.validateActiveDatabase();
  });

  ipcMain.handle('offline-storage:restore', async () => {
    const manager = getStorageManager();
    const activeDir = manager.getActiveDataDir();
    if (!activeDir) {
      throw new Error('ابتدا باید محل ذخیره‌سازی آفلاین را انتخاب کنید.');
    }
    manager.restoreFromBackup(activeDir);
    await restartServers();
    return manager.validateActiveDatabase();
  });

  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('app:open-external', async (_event, url) => {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL');
    }
    await shell.openExternal(url);
    return true;
  });
}

app.whenReady().then(async () => {
  startupT0 = Date.now();
  Menu.setApplicationMenu(null);
  logFilePath = path.join(app.getPath('userData'), 'startup.log');
  log(`App starting (timing t0)`);
  createSplashWindow();
  registerIpcHandlers();

  try {
    const folderReady = await ensureCustomStorageFolder();
    log(`timing: storage folder ready +${startupMs()}ms`);
    if (!folderReady) {
      app.quit();
      return;
    }

    const ready = await ensureDatabaseReady();
    log(`timing: database ready +${startupMs()}ms`);
    if (!ready) {
      app.quit();
      return;
    }

    await startServers();
    createWindow();
    log(`timing: main window created +${startupMs()}ms`);
    scheduleBackupInBackground();
  } catch (error) {
    closeSplashWindow();
    const logHint = logFilePath ? `\n\nSee log: ${logFilePath}` : '';
    dialog.showErrorBox('Startup failed', `${error.message}${logHint}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  try {
    getStorageManager().updateBackupFromActive();
  } catch (error) {
    log('Failed to update offline backup on quit', error);
  }
  stopChildren();
  app.quit();
});

app.on('before-quit', () => {
  try {
    getStorageManager().updateBackupFromActive();
  } catch (error) {
    log('Failed to update offline backup before quit', error);
  }
  stopChildren();
});
