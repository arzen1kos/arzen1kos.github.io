import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectGitHubData } from './lib/github-data.mjs';
import { readGitHubTokens } from './lib/github-tokens.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const tokens = readGitHubTokens(process.env);
if (tokens.length === 0) {
  throw new Error('Set GH_TOKENS, GH_PAT, GH_TOKEN, or one or more GH_TOKEN_* values in .env or GitHub Actions.');
}

const { repos, github } = await collectGitHubData(tokens);
const outputDirectory = path.join(root, 'public', 'data');
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, 'repos.json'), `${JSON.stringify(repos, null, 2)}\n`),
  writeFile(path.join(outputDirectory, 'github.json'), `${JSON.stringify(github, null, 2)}\n`),
]);
console.log(`Exported ${github.accounts.length} GitHub accounts and ${repos.length} public, non-fork repositories.`);
