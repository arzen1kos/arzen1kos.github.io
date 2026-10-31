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
import type { CityRepo, RepoLanguage } from '@/components/contribution-city/types';

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
  tokenMissing: boolean;
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

  if (tokens.length === 0) return { repos: [], tokenMissing: true, errors: [] };

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
  return { repos, tokenMissing: false, errors };
}
