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
  private readonly configuration: any;

  constructor() {
    this.configuration = getConfig();
  }

  getAuthConfiguration(): IAuthConfiguration {
    return this.configuration.auth;
  }

  getDatabaseConfiguration(): IDatabaseConfiguration {
    return {
      ...this.configuration.database,
      port: Number(this.configuration.database.port),
    };
  }

  getAppConfiguration(): IAppConfiguration {
    return this.configuration.app;
  }

  getEnvironment(): string {
    return this.configuration.app.env;
  }
}
