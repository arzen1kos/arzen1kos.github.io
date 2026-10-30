export interface RepoLanguage {
  name: string;
  color: string;
  /** Share of the repo's code, 0-100 */
  percent: number;
}

export interface CityRepo {
  /** Opaque unique id (GitHub node id) */
  id: string;
  /** GitHub login of the account whose token fetched this repo */
  account: string;
  name: string;
  description: string | null;
  /** null => the tower is not clickable (e.g. redacted private repo) */
  url: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  /** true when name/description/url were stripped server-side */
  redacted: boolean;
  /** Total commits on the default branch */
  commits: number;
  pushedAt: string | null;
  /** Sorted by share, largest first */
  languages: RepoLanguage[];
}