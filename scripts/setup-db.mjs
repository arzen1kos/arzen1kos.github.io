import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const configuredPath = process.env.PORTFOLIO_DB_PATH ?? 'backend/db/portfolio.db';
const databasePath = path.resolve(root, configuredPath);
mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
try {
  database.pragma('foreign_keys = ON');
  database.exec(readFileSync(path.join(root, 'backend/db/schema.sql'), 'utf8'));

} finally {
  database.close();
}

console.log(`Portfolio database is ready at ${databasePath}`);
