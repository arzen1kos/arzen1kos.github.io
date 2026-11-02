import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGitHubData } from './github-data.mjs';

const account = (login, repoId, date, contributionCount) => ({
  repos: [{
    id: repoId,
    account: login,
    stars: 4,
    forks: 2,
  }],
  stats: {
    login,
    profileUrl: `https://github.com/${login}`,
    publicRepos: 1,
    followers: 3,
    following: 2,
    totalContributions: contributionCount,
    totalCommitContributions: contributionCount - 1,
    contributionDays: [{ date, count: contributionCount }],
  },
});

test('combines accounts, de-duplicates token owners and merges contribution dates', async () => {
  const calls = [];
  const records = new Map([
    ['first-token', account('first', 'repo-first', '2026-10-30', 5)],
    ['duplicate-token', account('FIRST', 'repo-first', '2026-10-30', 5)],
    ['second-token', account('second', 'repo-second', '2026-10-30', 2)],
  ]);

  const result = await collectGitHubData(
    ['first-token', 'duplicate-token', 'second-token'],
    (token) => ({
      fetchAccount: async () => {
        calls.push(token);
        return records.get(token);
      },
    }),
  );

  assert.equal(result.github.accounts.length, 2);
  assert.equal(result.repos.length, 2);
  assert.equal(result.github.totalContributions, 7);
  assert.deepEqual(result.github.contributionDays, [{ date: '2026-10-30', count: 7, level: 1 }]);
  assert.deepEqual(calls, ['first-token', 'duplicate-token', 'second-token']);
});

test('fails explicitly when any configured account cannot be fetched', async () => {
  await assert.rejects(
    collectGitHubData(['valid', 'invalid'], (token) => ({
      fetchAccount: async () => {
        if (token === 'invalid') throw new Error('HTTP 401');
        return account('valid', 'repo-valid', '2026-10-30', 1);
      },
    })),
    /token\(s\) 2: HTTP 401/,
  );
});
