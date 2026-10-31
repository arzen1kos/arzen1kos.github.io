import type { Repo } from '@/components/contribution-city/types';
import '@/lib/server-config';

const QUERY = `
query($cursor: String) {
  viewer {
    login
    repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name nameWithOwner description url isPrivate isArchived pushedAt
        primaryLanguage { name color }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
          totalSize
          edges { size node { name color } }
        }
        defaultBranchRef { target { ... on Commit { history { totalCount } } } }
      }
    }
  }
}`;

interface GqlRepo {
  id: string; name: string; nameWithOwner: string; description: string | null; url: string;
  isPrivate: boolean; isArchived: boolean; pushedAt: string | null;
  primaryLanguage: { name: string; color: string | null } | null;
  languages: { totalSize: number; edges: { size: number; node: { name: string; color: string | null } }[] };
  defaultBranchRef: { target: { history?: { totalCount: number } } | null } | null;
}

/** Every GITHUB_TOKEN_* environment variable is one account. */
function discoverTokens(): string[] {
  const found = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('GITHUB_TOKEN') && !!value)
    .map(([, value]) => value!);
  return [...new Set(found)];
}

async function fetchAccount(token: string): Promise<Repo[]> {
  const out: Repo[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const res: Response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'contribution-city' },
      body: JSON.stringify({ query: QUERY, variables: { cursor } }),
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const json = (await res.json()) as {
      data?: { viewer: { login: string; repositories: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: GqlRepo[] } } };
      errors?: { message: string }[];
    };
    if (!json.data) throw new Error(json.errors?.[0]?.message ?? 'No data from GitHub');
    const { login, repositories } = json.data.viewer;
    for (const n of repositories.nodes) {
      const total = n.languages.totalSize || 1;
      out.push({
        id: n.id,
        account: login,
        name: n.name,
        fullName: n.nameWithOwner,
        description: n.description,
        url: n.url,
        isPrivate: n.isPrivate,
        isArchived: n.isArchived,
        commits: n.defaultBranchRef?.target?.history?.totalCount ?? 0,
        pushedAt: n.pushedAt,
        primaryLanguage: n.primaryLanguage?.name ?? null,
        languages: n.languages.edges.map((e) => ({ name: e.node.name, color: e.node.color, share: e.size / total })),
      });
    }
    if (!repositories.pageInfo.hasNextPage) break;
    cursor = repositories.pageInfo.endCursor;
  }
  return out;
}

let cache: { at: number; repos: Repo[]; tokenMissing: boolean } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function getRepos(): Promise<{ repos: Repo[]; tokenMissing: boolean }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const tokens = discoverTokens();
  if (tokens.length === 0) {
    cache = { at: Date.now(), repos: [], tokenMissing: true };
    return cache;
  }
  const settled = await Promise.allSettled(tokens.map(fetchAccount));
  const byId = new Map<string, Repo>();
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') result.value.forEach((r) => byId.set(r.id, r));
    else console.warn(`[contribution-city] account #${i + 1} failed:`, result.reason);
  });
  // If every account failed, keep serving the last good data rather than an empty city.
  if (byId.size === 0 && cache) return cache;
  cache = { at: Date.now(), repos: [...byId.values()], tokenMissing: false };
  return cache;
}
