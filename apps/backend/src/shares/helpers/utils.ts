import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const cwd = process.cwd();

// 1. Automatically find and load .env (prioritize local, then root)
const localEnv = path.join(cwd, '.env');
const rootEnv = path.join(cwd, '../../.env');

if (fs.existsSync(localEnv)) {
  dotenvConfig({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenvConfig({ path: rootEnv });
}

// 2. Automatically determine NODE_CONFIG_DIR if not set
if (!process.env.NODE_CONFIG_DIR) {
  const rootConfig = path.join(cwd, '../../config');
  const localConfig = path.join(cwd, 'config');
  const distConfig = path.join(cwd, 'dist/config');

  if (fs.existsSync(rootConfig)) {
    process.env.NODE_CONFIG_DIR = rootConfig;
  } else if (fs.existsSync(localConfig)) {
    process.env.NODE_CONFIG_DIR = localConfig;
  } else if (fs.existsSync(distConfig)) {
    process.env.NODE_CONFIG_DIR = distConfig;
  }
}

// 3. Use require to ensure config reads the latest environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('config');

export function isNullOrUndefined(value: unknown): boolean {
  return value === null || value === undefined;
}

export function getConfig() {
  return config;
}
