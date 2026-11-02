import { GitHubGraphQLClient } from './github-api.mjs';

async function mapConcurrent(items, limit, callback) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await callback(items[index], index);
    }
  }));
  return results;
}

function mergeContributionDays(accounts) {
  const totalsByDate = new Map();
  accounts.flatMap((account) => account.stats.contributionDays).forEach((day) => {
    totalsByDate.set(day.date, (totalsByDate.get(day.date) ?? 0) + day.count);
  });

  const days = [...totalsByDate.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({ date, count, level: 0 }));
  const activeCounts = days.map((day) => day.count).filter((count) => count > 0).sort((a, b) => a - b);
  const quantile = (fraction) => activeCounts[Math.floor((activeCounts.length - 1) * fraction)] ?? 0;
  const [firstQuartile, secondQuartile, thirdQuartile] = [0.25, 0.5, 0.75].map(quantile);

  days.forEach((day) => {
    if (day.count === 0) return;
    day.level = day.count <= firstQuartile ? 1
      : day.count <= secondQuartile ? 2
        : day.count <= thirdQuartile ? 3 : 4;
  });
  return days;
}

export async function collectGitHubData(tokens, createClient = (token) => new GitHubGraphQLClient(token)) {
  const accountsByLogin = new Map();
  const failures = [];

  await mapConcurrent(tokens, 4, async (token, index) => {
    try {
      const account = await createClient(token).fetchAccount();
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

  return {
    repos,
    github: {
      accounts: accountStats,
      totalContributions: accountStats.reduce((total, account) => total + account.totalContributions, 0),
      totalCommitContributions: accountStats.reduce((total, account) => total + account.totalCommitContributions, 0),
      contributionDays: mergeContributionDays(accounts),
    },
  };
}
