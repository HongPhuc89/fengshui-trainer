import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import config from 'config';

export function isNullOrUndefined(value: any): boolean {
  return value === null || value === undefined;
}

export function getConfig() {
  return config;
}
