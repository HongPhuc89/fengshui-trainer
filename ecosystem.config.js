module.exports = {
    apps: [
        {
            name: 'backend',
            cwd: './apps/backend',
            script: 'npm',
            args: 'run start:prod',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                NODE_CONFIG_DIR: '../../config',
            },
            error_file: '~/.pm2/logs/backend-error.log',
            out_file: '~/.pm2/logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
        {
            name: 'admin',
            cwd: './apps/admin',
            script: 'npx',
            args: 'serve -s dist -l 3001',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
            },
            error_file: '~/.pm2/logs/admin-error.log',
            out_file: '~/.pm2/logs/admin-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};
