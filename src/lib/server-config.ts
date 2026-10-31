import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const envFile = path.join(REPO_ROOT, '.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const configuredPath = process.env.PORTFOLIO_DB_PATH ?? 'backend/db/portfolio.db';
export const PORTFOLIO_DB_PATH = path.resolve(REPO_ROOT, configuredPath);
