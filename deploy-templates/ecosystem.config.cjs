const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'easystock-server',
      cwd: root,
      script: 'backend/dist/server.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
