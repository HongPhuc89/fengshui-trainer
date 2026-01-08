import { Injectable } from '@nestjs/common';
import { getConfig } from '../../shares/helpers/utils';

export interface IAuthConfiguration {
  jwt: {
    secretKey: string;
    expireTime: string;
    secretKeyActivateToken: string;
    expireTimeActivateToken: number;
  };
  refreshToken: {
    secretKey: string;
    expireTime: string;
    secretKeyActivateToken: string;
  };
}

export interface IDatabaseConfiguration {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface IAppConfiguration {
  port: number;
  prefix: string;
  env: string;
  url: string;
  version: string;
  name: string;
}

@Injectable()
export class ConfigService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly configuration: any;

  constructor() {
    this.configuration = getConfig();
  }

  getAuthConfiguration(): IAuthConfiguration {
    return this.configuration.auth;
  }

  getDatabaseConfiguration(): IDatabaseConfiguration {
    if (!this.configuration.database) {
      throw new Error(
        'Database configuration is missing! Check if your config files are loaded and DB_ environment variables are set.',
      );
    }
    return {
      ...this.configuration.database,
      port: Number(this.configuration.database.port),
    };
  }

  getAppConfiguration(): IAppConfiguration {
    if (!this.configuration.app) {
      throw new Error('App configuration is missing!');
    }
    return this.configuration.app;
  }

  getEnvironment(): string {
    return this.configuration.app.env;
  }
}
