import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { EntityList } from './database/entities/index.js';
import { MigrationList } from './database/migrations/index.js';

const defaultOptions = {
  type: 'postgres' as const,
  host: process.env['PICSUR_DB_HOST'] || 'localhost',
  port: parseInt(process.env['PICSUR_DB_PORT'] || '5432', 10),
  username: process.env['PICSUR_DB_USERNAME'] || 'postgres',
  password: process.env['PICSUR_DB_PASSWORD'] || 'postgres',
  database: process.env['PICSUR_DB_DATABASE'] || 'picsur',
  synchronize: false,
  migrationsRun: true,
  entities: EntityList,
  migrations: MigrationList,
  useUTC: true,
};

const dataSource = new DataSource(defaultOptions);

export default dataSource;