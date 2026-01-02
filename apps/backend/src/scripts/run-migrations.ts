import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { DataSource } from 'typeorm';
import config from 'config';

const { database, typeorm } = config;

const AppDataSource = new DataSource({
  type: typeorm.type as any,
  host: database.host,
  port: Number(database.port),
  username: database.username,
  password: database.password,
  database: database.database,
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  timezone: 'Z',
  synchronize: false,
  logging: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');

    await AppDataSource.runMigrations();
    console.log('Migrations have been executed successfully!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigrations();
