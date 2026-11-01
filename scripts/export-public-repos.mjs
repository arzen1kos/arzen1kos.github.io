import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

function discoverTokens() {
  const configured = [
    process.env.GITHUB_TOKENS ?? '',
    process.env.GH_PAT ?? '',
    ...Object.entries(process.env)
      .filter(([name]) => name.startsWith('GITHUB_TOKEN_'))
      .map(([, value]) => value ?? ''),
  ];
  return [...new Set(configured.flatMap((value) => value.split(/[,\r\n]+/))
    .map((token) => token.trim())
    .filter(Boolean))];
}

const tokens = discoverTokens();
if (tokens.length === 0) {
  throw new Error('Set GITHUB_TOKENS, GH_PAT, or one or more GITHUB_TOKEN_* values in .env or GitHub Actions.');
}

const QUERY = `
query($cursor: String, $from: DateTime!, $to: DateTime!, $includeContributions: Boolean!) {
  viewer {
    login
    url
    followers(first: 1) { totalCount }
    following(first: 1) { totalCount }
    publicRepositories: repositories(first: 1, ownerAffiliations: OWNER, privacy: PUBLIC) {
      totalCount
    }
    repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name nameWithOwner description url isPrivate isArchived pushedAt
        stargazerCount forkCount
        primaryLanguage { name color }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
          totalSize
          edges { size node { name color } }
        }
        defaultBranchRef { target { ... on Commit { history { totalCount } } } }
      }
    }
    contributionsCollection(from: $from, to: $to) @include(if: $includeContributions) {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function fetchAccount(token) {
  const to = new Date();
  const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
  const repos = [];
  let cursor = null;
  let account;
  let contributions;
  for (let page = 0; ; page += 1) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'contribution-city',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          cursor,
          from: from.toISOString(),
          to: to.toISOString(),
          includeContributions: page === 0,
        },
      }),
    });
    if (!response.ok) throw new Error(`GitHub GraphQL API returned HTTP ${response.status}.`);
    const result = await response.json();
    const viewer = result.data?.viewer;
    const repositories = viewer?.repositories;
    if (result.errors?.length || !viewer?.login || !repositories?.nodes) {
      throw new Error(result.errors?.[0]?.message ?? 'GitHub returned invalid account or repository data.');
    }
    account ??= {
      login: viewer.login,
      profileUrl: viewer.url,
      publicRepos: viewer.publicRepositories.totalCount,
      followers: viewer.followers.totalCount,
      following: viewer.following.totalCount,
    };
    if (page === 0) {
      contributions = viewer.contributionsCollection;
      if (!contributions?.contributionCalendar) {
        throw new Error(`GitHub returned no contribution calendar for ${viewer.login}.`);
      }
    }

    for (const repository of repositories.nodes) {
      // Private repository data must never be copied into the public Pages artifact.
      if (repository.isPrivate) continue;
      const totalSize = repository.languages.totalSize || 1;
      repos.push({
        id: repository.id,
        account: viewer.login,
        name: repository.name,
        fullName: repository.nameWithOwner,
        description: repository.description,
        url: repository.url,
        isPrivate: false,
        isArchived: repository.isArchived,
        commits: repository.defaultBranchRef?.target?.history?.totalCount ?? 0,
        pushedAt: repository.pushedAt,
        primaryLanguage: repository.primaryLanguage?.name ?? null,
        languages: repository.languages.edges.map((language) => ({
          name: language.node.name,
          color: language.node.color,
          share: language.size / totalSize,
        })),
        stars: repository.stargazerCount,
        forks: repository.forkCount,
      });
    }

    if (!repositories.pageInfo.hasNextPage) break;
    cursor = repositories.pageInfo.endCursor;
  }

  const calendar = contributions.contributionCalendar;
  return {
    repos,
    stats: {
      login: account.login,
      profileUrl: account.profileUrl,
      publicRepos: account.publicRepos,
      followers: account.followers,
      following: account.following,
      totalContributions: calendar.totalContributions,
      totalCommitContributions: contributions.totalCommitContributions,
      contributionDays: calendar.weeks.flatMap((week) => week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
      }))),
    },
  };
}

async function mapConcurrent(items, limit, callback) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await callback(items[index]);
    }
  }));
  return results;
}

const accountsByLogin = new Map();
const failures = [];
await mapConcurrent(tokens, 4, async (token, index) => {
  try {
    const account = await fetchAccount(token);
    accountsByLogin.set(account.stats.login.toLowerCase(), account);
  } catch (error) {
    failures.push({ index, error });
  }
});
if (failures.length > 0) {
  throw new Error(
    `GitHub account retrieval failed for token(s) ${failures.map(({ index }) => index + 1).join(', ')}: `
    + failures.map(({ error }) => error instanceof Error ? error.message : String(error)).join('; '),
  );
}

const accounts = [...accountsByLogin.values()];
const reposById = new Map();
accounts.flatMap((account) => account.repos).forEach((repo) => reposById.set(repo.id, repo));
const repos = [...reposById.values()];
const accountStats = accounts.map(({ stats, repos: accountRepos }) => ({
  ...stats,
  stars: accountRepos.reduce((total, repo) => total + repo.stars, 0),
  forks: accountRepos.reduce((total, repo) => total + repo.forks, 0),
}));

const daysByDate = new Map();
accountStats.flatMap((account) => account.contributionDays).forEach((day) => {
  daysByDate.set(day.date, (daysByDate.get(day.date) ?? 0) + day.count);
});
const contributionDays = [...daysByDate.entries()]
  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
  .map(([date, count]) => ({ date, count, level: 0 }));
const activeCounts = contributionDays.map((day) => day.count).filter((count) => count > 0).sort((a, b) => a - b);
const quantile = (fraction) => activeCounts[Math.floor((activeCounts.length - 1) * fraction)] ?? 0;
const [firstQuartile, secondQuartile, thirdQuartile] = [quantile(0.25), quantile(0.5), quantile(0.75)];
contributionDays.forEach((day) => {
  if (day.count === 0) return;
  day.level = day.count <= firstQuartile ? 1
    : day.count <= secondQuartile ? 2
      : day.count <= thirdQuartile ? 3 : 4;
});

const githubStats = {
  accounts: accountStats,
  totalContributions: accountStats.reduce((total, account) => total + account.totalContributions, 0),
  totalCommitContributions: accountStats.reduce((total, account) => total + account.totalCommitContributions, 0),
  contributionDays,
};

const outputDirectory = path.join(root, 'public', 'data');
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, 'repos.json'), `${JSON.stringify(repos, null, 2)}\n`),
  writeFile(path.join(outputDirectory, 'github.json'), `${JSON.stringify(githubStats, null, 2)}\n`),
]);
console.log(`Exported ${accountStats.length} GitHub accounts and ${repos.length} public, non-fork repositories.`);
