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

/* ---------- Tech stack books ---------- */

export interface TechItem {
  id: number | string;
  name: string;
  /** Image URL. If missing or broken, a letter badge is shown instead. */
  iconUrl?: string | null;
}

export interface TechCategory {
  id: string;
  /** Shown in the capsule on the card and under the floating book */
  name: string;
  items: TechItem[];
  /** Cover colour (any CSS colour). Defaults to a palette colour. */
  color?: string;
  /** Per-book size multiplier, on top of the global bookScale. */
  scale?: number;
}

/* ---------- Experience mountains ---------- */

export interface ExperienceEntry {
  id: number;
  title: string;
  organisation: string;
  location?: string | null;
  /** ISO date, e.g. "2025-12-01" */
  startDate: string;
  /** ISO date, or null for "Present" */
  endDate: string | null;
  /** Short text, shown in the timeline list and on the detail card */
  summary: string;
  /** Longer text, shown on the detail card only. Line breaks are kept. */
  details?: string[] | null;
  descriptionText?: string | null;
  highlights?: string[];
  tags?: string[];
  mountainId?: number | null;
  /** If set, "Expand" navigates here (your full page). Otherwise it opens the detail card. */
  href?: string | null;
}

export interface ExperienceMountain {
  id: string;
  /** Panel heading, e.g. "Experience" */
  name: string;
  subtitle?: string | null;
  /** Any order; flags are placed oldest (base) to newest (summit) */
  entries: ExperienceEntry[];
  angleDegrees?: number;
  distance?: number;
  radius?: number;
  height?: number;
  seed?: number;
  color?: string;
}