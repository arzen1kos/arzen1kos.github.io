const REPOSITORY_QUERY = `
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

export class GitHubGraphQLClient {
  constructor(token, fetchRequest = fetch, getCurrentDate = () => new Date()) {
    this.token = token;
    this.fetchRequest = fetchRequest;
    this.getCurrentDate = getCurrentDate;
  }

  async fetchAccount() {
    const to = this.getCurrentDate();
    const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
    const repositories = [];
    let cursor = null;
    let account;
    let contributions;

    for (let page = 0; ; page += 1) {
      const response = await this.fetchRequest('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `bearer ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'contribution-city',
        },
        body: JSON.stringify({
          query: REPOSITORY_QUERY,
          variables: {
            cursor,
            from: from.toISOString(),
            to: to.toISOString(),
            includeContributions: page === 0,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`GitHub GraphQL API returned HTTP ${response.status}.`);
      }

      const result = await response.json();
      const viewer = result.data?.viewer;
      const pageOfRepositories = viewer?.repositories;
      if (result.errors?.length || !viewer?.login || !pageOfRepositories?.nodes) {
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

      for (const repository of pageOfRepositories.nodes) {
        if (repository.isPrivate) continue;
        const totalSize = repository.languages.totalSize || 1;
        repositories.push({
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

      if (!pageOfRepositories.pageInfo.hasNextPage) break;
      cursor = pageOfRepositories.pageInfo.endCursor;
      if (!cursor) throw new Error(`GitHub returned a missing pagination cursor for ${viewer.login}.`);
    }

    const calendar = contributions.contributionCalendar;
    return {
      repos: repositories,
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
}
