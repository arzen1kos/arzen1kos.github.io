const TOKEN_LIST_VARIABLES = ['GH_TOKENS', 'GITHUB_TOKENS'];
const SINGLE_TOKEN_VARIABLES = ['GH_TOKEN', 'GH_PAT', 'GITHUB_TOKEN'];
const TOKEN_PREFIXES = ['GH_TOKEN_', 'GITHUB_TOKEN_'];

export function readGitHubTokens(environment) {
  const configured = [
    ...TOKEN_LIST_VARIABLES.map((name) => environment[name] ?? ''),
    ...SINGLE_TOKEN_VARIABLES.map((name) => environment[name] ?? ''),
    ...Object.entries(environment)
      .filter(([name]) => TOKEN_PREFIXES.some((prefix) => name.startsWith(prefix)))
      .map(([, value]) => value ?? ''),
  ];

  return [...new Set(configured
    .flatMap((value) => value.split(/[,\r\n]+/))
    .map((token) => token.trim())
    .filter(Boolean))];
}
