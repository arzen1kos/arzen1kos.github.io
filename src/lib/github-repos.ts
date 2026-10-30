/**
 * Build-time GitHub loader. Runs only on the server (Astro frontmatter / endpoints),
 * so your tokens never reach the browser.
 *
 * Env:
 *   GITHUB_TOKENS          comma-separated personal access tokens, one per account
 *   GITHUB_INCLUDE_FORKS   "true" to include forks (default: false)
 *   GITHUB_REDACT_PRIVATE  "false" to show private repo names/descriptions/links
 *                          (default: true, so a public site doesn't leak them)
 */
import type { CityRepo, RepoLanguage } from '@/components/city/types';

const QUERY = /* GraphQL */ `
  query ($after: String, $isFork: Boolean) {
    viewer {
      login
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        isFork: $isFork
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          name
          description
          url
          isPrivate
          isArchived
          isFork
          pushedAt
          languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges { size node { name color } }
          }
          defaultBranchRef {
            target { ... on Commit { history { totalCount } } }
          }
        }
      }
    }
  }
`;

interface GqlRepo {
  id: string;
  name: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  pushedAt: string | null;
  languages: {
    totalSize: number;
    edges: { size: number; node: { name: string; color: string | null } }[];
  };
  defaultBranchRef: { target: { history?: { totalCount: number } } | null } | null;
}

interface GqlResponse {
  data?: {
    viewer: {
      login: string;
      repositories: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: GqlRepo[];
      };
    };
  };
  errors?: { message: string }[];
}

export interface LoadOptions {
  tokens?: string[];
  includeForks?: boolean;
  redactPrivate?: boolean;
}

export interface LoadResult {
  repos: CityRepo[];
  /** true when no token was configured and sample data was returned */
  demo: boolean;
  errors: string[];
}

async function fetchAccount(token: string, includeForks: boolean, redactPrivate: boolean): Promise<CityRepo[]> {
  const out: CityRepo[] = [];
  let after: string | null = null;

  do {
    const res: Response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'contribution-city',
      },
      body: JSON.stringify({ query: QUERY, variables: { after, isFork: includeForks ? null : false } }),
    });
    if (!res.ok) throw new Error(`GitHub responded with HTTP ${res.status}`);

    const json = (await res.json()) as GqlResponse;
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
    if (!json.data) throw new Error('GitHub returned no data');

    const { login, repositories } = json.data.viewer;
    for (const r of repositories.nodes) {
      const total = r.languages.totalSize || 0;
      const languages: RepoLanguage[] = r.languages.edges.map((e) => ({
        name: e.node.name,
        color: e.node.color ?? '#8b949e',
        percent: total ? Math.round((e.size / total) * 100) : 0,
      }));
      const hide = redactPrivate && r.isPrivate;
      out.push({
        id: r.id,
        account: login,
        name: hide ? 'Private repository' : r.name,
        description: hide ? null : r.description,
        url: hide ? null : r.url,
        isPrivate: r.isPrivate,
        isArchived: r.isArchived,
        isFork: r.isFork,
        redacted: hide,
        commits: r.defaultBranchRef?.target?.history?.totalCount ?? 0,
        pushedAt: r.pushedAt,
        languages,
      });
    }
    after = repositories.pageInfo.hasNextPage ? repositories.pageInfo.endCursor : null;
  } while (after);

  return out;
}

export async function loadCityRepos(opts: LoadOptions = {}): Promise<LoadResult> {
  const env = import.meta.env;
  const tokens =
    opts.tokens ??
    String(env.GITHUB_TOKENS ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  const includeForks = opts.includeForks ?? env.GITHUB_INCLUDE_FORKS === 'true';
  const redactPrivate = opts.redactPrivate ?? env.GITHUB_REDACT_PRIVATE !== 'false';

  if (tokens.length === 0) return { repos: demoRepos(), demo: true, errors: [] };

  const errors: string[] = [];
  const results = await Promise.all(
    tokens.map(async (token, i) => {
      try {
        return await fetchAccount(token, includeForks, redactPrivate);
      } catch (err) {
        errors.push(`Token #${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
        return [] as CityRepo[];
      }
    }),
  );

  // Same repo reachable from two tokens? Keep one.
  const seen = new Set<string>();
  const repos = results.flat().filter((r) => !seen.has(r.id) && !!seen.add(r.id));
  for (const e of errors) console.warn(`[contribution-city] ${e}`);
  return { repos, demo: false, errors };
}

/** Deterministic sample data so the city renders before any token is configured. */
function demoRepos(): CityRepo[] {
  let seed = 42;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const langs: [string, string][] = [
    ['TypeScript', '#3178c6'],
    ['OCaml', '#ef7a08'],
    ['C#', '#178600'],
    ['Python', '#3572A5'],
    ['JavaScript', '#f1e05a'],
    ['C++', '#f34b7d'],
  ];
  const accounts = ['you', 'your-other-account'];

  return Array.from({ length: 48 }, (_, i) => {
    const a = langs[Math.floor(rnd() * langs.length)];
    const b = langs[Math.floor(rnd() * langs.length)];
    const main = 55 + Math.floor(rnd() * 40);
    const languages: RepoLanguage[] =
      a[0] === b[0]
        ? [{ name: a[0], color: a[1], percent: 100 }]
        : [
            { name: a[0], color: a[1], percent: main },
            { name: b[0], color: b[1], percent: 100 - main },
          ];
    return {
      id: `demo-${i}`,
      account: accounts[i % accounts.length],
      name: `sample-repo-${i + 1}`,
      description: 'Sample data. Add GITHUB_TOKENS to .env to see your real repositories.',
      url: 'https://github.com',
      isPrivate: i % 7 === 3,
      isArchived: i % 9 === 5,
      isFork: false,
      redacted: false,
      commits: Math.floor(rnd() ** 3 * 600) + 1,
      pushedAt: new Date(Date.now() - Math.floor(rnd() * 400) * 86_400_000).toISOString(),
      languages,
    };
  });
}