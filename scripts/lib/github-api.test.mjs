import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubGraphQLClient } from './github-api.mjs';

const makeRepository = (overrides = {}) => ({
  id: 'repo-1',
  name: 'portfolio',
  nameWithOwner: 'account/portfolio',
  description: 'Portfolio site',
  url: 'https://github.com/account/portfolio',
  isPrivate: false,
  isArchived: false,
  pushedAt: '2026-10-30T00:00:00Z',
  stargazerCount: 12,
  forkCount: 3,
  primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
  languages: {
    totalSize: 100,
    edges: [{ size: 100, node: { name: 'TypeScript', color: '#3178c6' } }],
  },
  defaultBranchRef: { target: { history: { totalCount: 42 } } },
  ...overrides,
});

const makeResponse = ({ hasNextPage = false, endCursor = null, nodes = [makeRepository()] } = {}) => ({
  ok: true,
  json: async () => ({
    data: {
      viewer: {
        login: 'account',
        url: 'https://github.com/account',
        followers: { totalCount: 10 },
        following: { totalCount: 5 },
        publicRepositories: { totalCount: 1 },
        repositories: { pageInfo: { hasNextPage, endCursor }, nodes },
        contributionsCollection: {
          totalCommitContributions: 35,
          contributionCalendar: {
            totalContributions: 50,
            weeks: [{ contributionDays: [{ date: '2026-10-30', contributionCount: 2 }] }],
          },
        },
      },
    },
  }),
});

test('sends the configured token and exports only public repository fields', async () => {
  let request;
  const client = new GitHubGraphQLClient(
    'never-log-this-token',
    async (url, options) => {
      request = { url, options };
      return makeResponse({
        nodes: [
          makeRepository(),
          makeRepository({ id: 'private-repo', name: 'secret', isPrivate: true }),
        ],
      });
    },
    () => new Date('2026-11-01T00:00:00Z'),
  );

  const account = await client.fetchAccount();

  assert.equal(request.url, 'https://api.github.com/graphql');
  assert.equal(request.options.headers.Authorization, 'bearer never-log-this-token');
  assert.equal(account.stats.login, 'account');
  assert.equal(account.stats.followers, 10);
  assert.equal(account.stats.totalContributions, 50);
  assert.equal(account.repos.length, 1);
  assert.equal(account.repos[0].commits, 42);
  assert.equal(account.repos[0].languages[0].share, 1);
  assert.equal(account.repos[0].isPrivate, false);
});

test('follows repository pagination while fetching contributions once', async () => {
  const requests = [];
  const responses = [
    makeResponse({ hasNextPage: true, endCursor: 'next-page' }),
    makeResponse({ nodes: [makeRepository({ id: 'repo-2', name: 'another' })] }),
  ];
  const client = new GitHubGraphQLClient('token', async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return responses.shift();
  });

  const account = await client.fetchAccount();

  assert.equal(account.repos.length, 2);
  assert.equal(requests[0].variables.includeContributions, true);
  assert.equal(requests[1].variables.includeContributions, false);
  assert.equal(requests[1].variables.cursor, 'next-page');
});
