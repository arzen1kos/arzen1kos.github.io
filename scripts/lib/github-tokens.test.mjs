import test from 'node:test';
import assert from 'node:assert/strict';
import { readGitHubTokens } from './github-tokens.mjs';

test('reads comma-separated GH_TOKENS and trims values', () => {
  assert.deepEqual(readGitHubTokens({ GH_TOKENS: ' first-token, second-token \n third-token ' }), [
    'first-token',
    'second-token',
    'third-token',
  ]);
});

test('reads one token from each account variable and deduplicates tokens', () => {
  assert.deepEqual(readGitHubTokens({
    GH_TOKEN_PERSONAL: 'personal-token',
    GH_TOKEN_WORK: 'work-token',
    GITHUB_TOKEN_OLD: 'personal-token',
  }), ['personal-token', 'work-token']);
});

test('supports the legacy single-token environment variables', () => {
  assert.deepEqual(readGitHubTokens({ GH_PAT: 'legacy-token', GH_TOKEN: 'single-token' }), [
    'single-token',
    'legacy-token',
  ]);
});

test('returns no tokens for empty configuration', () => {
  assert.deepEqual(readGitHubTokens({ GH_TOKENS: ' , \n ' }), []);
});
