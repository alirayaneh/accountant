const fs = require('fs');
const path = require('path');

const DB_FILENAME = 'database.sqlite';
const UPLOADS_DIR = 'uploads';
const BACKUP_DIR = 'offline-backup';
const CONFIG_FILENAME = 'storage-config.json';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileIfExists(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirectoryRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function isPathInside(childPath, parentPath) {
  const child = path.resolve(childPath);
  const parent = path.resolve(parentPath);
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function createOfflineStorageManager(userDataPath, options = {}) {
  const forbiddenRoots = (options.forbiddenRoots || []).map((root) => path.resolve(root));
  const configPath = path.join(userDataPath, CONFIG_FILENAME);
  const runtimeOnlyDir = path.join(userDataPath, 'runtime-only');

  function getDefaultDataDir() {
    return userDataPath;
  }

  function normalizeStorageType(value) {
    return value === 'online' ? 'online' : 'sqlite';
  }

  function loadConfig() {
    try {
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          dataDir: typeof parsed.dataDir === 'string' && parsed.dataDir.trim()
            ? parsed.dataDir.trim()
            : null,
          storageType: normalizeStorageType(parsed.storageType),
        };
      }
    } catch (_) {
      // Fall back to default config.
    }
    return { dataDir: null, storageType: 'sqlite' };
  }

  function saveConfig(config) {
    ensureDir(userDataPath);
    const current = loadConfig();
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        dataDir: config.dataDir !== undefined ? config.dataDir : current.dataDir,
        storageType: normalizeStorageType(
          config.storageType !== undefined ? config.storageType : current.storageType
        ),
      }, null, 2),
      'utf8'
    );
  }

  function saveStorageType(storageType) {
    saveConfig({ storageType: normalizeStorageType(storageType) });
  }

  function isAllowedCustomDataDir(folderPath) {
    const resolved = path.resolve(folderPath);
    return !forbiddenRoots.some((forbiddenRoot) => isPathInside(resolved, forbiddenRoot));
  }

  function getConfiguredDataDir() {
    const config = loadConfig();
    if (!config.dataDir) {
      return null;
    }
    return path.resolve(config.dataDir);
  }

  function getActiveDataDir() {
    const config = loadConfig();

    if (config.storageType === 'online') {
      const configured = getConfiguredDataDir();
      if (configured && isAllowedCustomDataDir(configured)) {
        return configured;
      }
      return runtimeOnlyDir;
    }

    const configured = getConfiguredDataDir();
    if (configured && isAllowedCustomDataDir(configured)) {
      return configured;
    }
    return null;
  }

  function requiresCustomDataDir() {
    const config = loadConfig();
    if (config.storageType === 'online') {
      return false;
    }
    return getActiveDataDir() === null;
  }

  function getPaths(dataDir) {
    const backupRoot = path.join(userDataPath, BACKUP_DIR);
    return {
      dataDir,
      dbPath: path.join(dataDir, DB_FILENAME),
      uploadDir: path.join(dataDir, UPLOADS_DIR),
      backupDbPath: path.join(backupRoot, DB_FILENAME),
      backupUploadDir: path.join(backupRoot, UPLOADS_DIR),
      backupRoot,
    };
  }

  function getLegacyDataSourceDir() {
    const configured = getConfiguredDataDir();
    if (configured && isAllowedCustomDataDir(configured)) {
      return configured;
    }
    return getDefaultDataDir();
  }

  function copyDatabaseBundle(fromDir, toDir) {
    ensureDir(toDir);
    const fromPaths = getPaths(fromDir);
    const toPaths = getPaths(toDir);

    copyFileIfExists(fromPaths.dbPath, toPaths.dbPath);
    copyDirectoryRecursive(fromPaths.uploadDir, toPaths.uploadDir);
    ensureDir(toPaths.uploadDir);
  }

  function updateBackupFromActive() {
    const activeDir = getActiveDataDir();
    if (!activeDir) {
      return;
    }

    const activePaths = getPaths(activeDir);
    const backupPaths = getPaths(path.join(userDataPath, BACKUP_DIR));

    ensureDir(backupPaths.backupRoot);
    if (fs.existsSync(activePaths.dbPath)) {
      copyFileIfExists(activePaths.dbPath, backupPaths.backupDbPath);
    }
    if (fs.existsSync(activePaths.uploadDir)) {
      copyDirectoryRecursive(activePaths.uploadDir, backupPaths.backupUploadDir);
    }
    ensureDir(backupPaths.backupUploadDir);
  }

  function restoreFromBackup(targetDir) {
    if (!isAllowedCustomDataDir(targetDir)) {
      throw new Error('محل بازیابی باید خارج از پوشه نصب برنامه باشد.');
    }

    const backupPaths = getPaths(path.join(userDataPath, BACKUP_DIR));
    const targetPaths = getPaths(targetDir);

    if (!fs.existsSync(backupPaths.backupDbPath)) {
      throw new Error('نسخه پشتیبان دیتابیس یافت نشد.');
    }

    ensureDir(targetDir);
    copyFileIfExists(backupPaths.backupDbPath, targetPaths.dbPath);
    copyDirectoryRecursive(backupPaths.backupUploadDir, targetPaths.uploadDir);
    ensureDir(targetPaths.uploadDir);
  }

  function hasBackup() {
    const backupPaths = getPaths(path.join(userDataPath, BACKUP_DIR));
    return fs.existsSync(backupPaths.backupDbPath);
  }

  function validateActiveDatabase() {
    const config = loadConfig();
    const configuredDir = config.dataDir ? path.resolve(config.dataDir) : null;
    const activeDir = getActiveDataDir();
    const requiresFolder = requiresCustomDataDir();
    const configuredButForbidden = Boolean(
      config.storageType === 'sqlite'
      && configuredDir
      && !isAllowedCustomDataDir(configuredDir)
    );

    if (requiresFolder) {
      return {
        ok: false,
        missingDb: true,
        activeDir: configuredDir || '',
        dbPath: configuredDir ? path.join(configuredDir, DB_FILENAME) : '',
        uploadDir: configuredDir ? path.join(configuredDir, UPLOADS_DIR) : '',
        hasBackup: hasBackup(),
        isCustomPath: Boolean(config.dataDir),
        isValidCustomPath: false,
        requiresCustomDataDir: true,
        configuredButForbidden,
        storageType: config.storageType,
        defaultDataDir: getDefaultDataDir(),
      };
    }

    const activePaths = getPaths(activeDir);
    const dbExists = fs.existsSync(activePaths.dbPath);

    return {
      ok: dbExists,
      missingDb: !dbExists,
      activeDir,
      dbPath: activePaths.dbPath,
      uploadDir: activePaths.uploadDir,
      hasBackup: hasBackup(),
      isCustomPath: config.storageType === 'sqlite',
      isValidCustomPath: config.storageType === 'online' || isAllowedCustomDataDir(activeDir),
      requiresCustomDataDir: false,
      configuredButForbidden: false,
      storageType: config.storageType,
      defaultDataDir: getDefaultDataDir(),
    };
  }

  function shouldRequireExistingDatabase() {
    if (requiresCustomDataDir()) {
      return false;
    }

    const validation = validateActiveDatabase();
    if (validation.ok) {
      return true;
    }
    if (validation.missingDb && validation.hasBackup) {
      return true;
    }
    if (validation.isCustomPath) {
      return true;
    }
    return false;
  }

  function applyCustomDataDir(folderPath) {
    const normalized = path.resolve(folderPath);

    if (!isAllowedCustomDataDir(normalized)) {
      throw new Error(
        'پوشه انتخاب‌شده مجاز نیست. محل ذخیره‌سازی باید خارج از پوشه نصب برنامه و پوشه‌های داخلی آن باشد.'
      );
    }

    const sourceDir = getLegacyDataSourceDir();
    if (path.resolve(sourceDir) !== normalized) {
      copyDatabaseBundle(sourceDir, normalized);
    }

    saveConfig({ dataDir: normalized });
    updateBackupFromActive();
    return getPaths(normalized);
  }

  return {
    getDefaultDataDir,
    getActiveDataDir,
    getPaths,
    loadConfig,
    saveConfig,
    saveStorageType,
    copyDatabaseBundle,
    updateBackupFromActive,
    restoreFromBackup,
    validateActiveDatabase,
    shouldRequireExistingDatabase,
    applyCustomDataDir,
    hasBackup,
    requiresCustomDataDir,
    isAllowedCustomDataDir,
    isPathInside,
  };
}

module.exports = {
  createOfflineStorageManager,
  DB_FILENAME,
  UPLOADS_DIR,
  isPathInside,
};
