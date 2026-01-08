import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';

// Load .env from apps/backend/.env OR root .env
dotenvConfig({ path: path.join(process.cwd(), '.env') });
dotenvConfig({ path: path.join(process.cwd(), '../../.env') });
import config from 'config';

export function isNullOrUndefined(value: any): boolean {
  return value === null || value === undefined;
}

export function getConfig() {
  return config;
}
