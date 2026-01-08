import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async checkHealth() {
    try {
      // Check database connection by running a simple query
      // Using 'SELECT current_database()' as a postgres equivalent of 'show database' to verify connection
      const result = await this.dataSource.query('SELECT current_database() as database_name');
      const dbName = result[0]?.database_name;

      return {
        status: 'ok',
        database: {
          connected: true,
          name: dbName,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: {
          connected: false,
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
