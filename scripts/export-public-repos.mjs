import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? 'arzen1kos';
const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'arzen1kos-github-pages-build',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function github(pathname) {
  const response = await fetch(`https://api.github.com${pathname}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status} for ${pathname}.`);
  }
  return response;
}

async function listRepositories() {
  const repositories = [];
  for (let page = 1; ; page += 1) {
    const response = await github(
      `/users/${encodeURIComponent(owner)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`,
    );
    const pageRepositories = await response.json();
    if (!Array.isArray(pageRepositories)) {
      throw new Error('GitHub API returned an invalid repository list.');
    }
    repositories.push(...pageRepositories.filter((repo) => !repo.private && !repo.fork));
    if (pageRepositories.length < 100) return repositories;
  }
}

async function getCommitCount(repository) {
  const response = await github(
    `/repos/${repository.full_name}/commits?sha=${encodeURIComponent(repository.default_branch)}&per_page=1`,
  );
  const commits = await response.json();
  if (!Array.isArray(commits)) {
    throw new Error(`GitHub returned invalid commit data for ${repository.full_name}.`);
  }
  const lastPage = response.headers.get('link')?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return lastPage ? Number(lastPage[1]) : commits.length;
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

const repositories = await listRepositories();
const repos = await mapConcurrent(repositories, 6, async (repository) => {
  const [languageResponse, commits] = await Promise.all([
    github(`/repos/${repository.full_name}/languages`),
    getCommitCount(repository),
  ]);
  const languageSizes = await languageResponse.json();
  const totalSize = Object.values(languageSizes).reduce((total, size) => total + size, 0) || 1;
  const languages = Object.entries(languageSizes)
    .sort((a, b) => b[1] - a[1])
    .map(([name, size]) => ({ name, color: null, share: size / totalSize }));

  return {
    id: String(repository.id),
    account: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description,
    url: repository.html_url,
    isPrivate: false,
    isArchived: repository.archived,
    commits,
    pushedAt: repository.pushed_at,
    primaryLanguage: repository.language,
    languages,
  };
});

const outputPath = path.join(root, 'public', 'data', 'repos.json');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(repos, null, 2)}\n`);
console.log(`Exported ${repos.length} public repositories for ${owner}.`);
