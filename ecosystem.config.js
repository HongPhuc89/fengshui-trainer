const path = require('path');

module.exports = {
    apps: [
        {
            name: 'backend',
            cwd: path.join(__dirname, 'apps/backend'),
            script: 'dist/src/main.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                NODE_CONFIG_DIR: path.join(__dirname, 'config'),
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
        {
            name: 'admin',
            cwd: path.join(__dirname, 'apps/admin'),
            script: 'npx',
            args: 'serve -s dist -l 3001',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};
