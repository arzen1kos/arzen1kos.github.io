import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const envFile = path.join(REPO_ROOT, '.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export const DJANGO_API_URL = (
  process.env.DJANGO_API_URL ?? 'http://127.0.0.1:8000'
).replace(/\/+$/, '');
