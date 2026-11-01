export type PeakKey = 'skills' | 'experience' | 'projects';
export type PortfolioSection = 'overview' | PeakKey;

export interface RepoLanguage { name: string; color: string | null; share: number }

export interface Repo {
  id: string;
  account: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  isArchived: boolean;
  commits: number;
  pushedAt: string | null;
  primaryLanguage: string | null;
  languages: RepoLanguage[];
}

export interface ContributionDay { date: string; count: number; level: number }

export interface GithubAccountStats {
  login: string;
  profileUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  stars: number;
  forks: number;
  totalContributions: number;
  totalCommitContributions: number;
  contributionDays: Omit<ContributionDay, 'level'>[];
}

export interface GithubStats {
  accounts: GithubAccountStats[];
  totalContributions: number;
  totalCommitContributions: number;
  contributionDays: ContributionDay[];
}

export interface Profile { name: string; headline: string; bio: string }

export interface ExperienceItem {
  id: number;
  title: string;
  organisation: string;
  location: string;
  startDate: string;
  endDate: string | null;
  summary: string;
  details: string[];
}

export interface SkillCategory { id: number; name: string; color: string; skills: string[] }
export interface SoftSkill { name: string; description: string }

export interface ProjectItem {
  id: number;
  repoFullName: string | null;
  displayName: string;
  description: string;
  languages: string[];
  color: string;
  /** GitHub URL for the linked repository, if it is available. */
  url: string | null;
}

export interface Portfolio {
  profile: Profile;
  experience: ExperienceItem[];
  skillCategories: SkillCategory[];
  softSkills: SoftSkill[];
  projects: ProjectItem[];
}

export interface CityPayload { repos: Repo[]; portfolio: Portfolio; github: GithubStats }

export type PanelState =
  | { kind: 'default' }
  | { kind: 'repo'; repo: Repo }
  | { kind: PeakKey };
