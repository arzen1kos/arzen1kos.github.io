export interface Project {
  id: string;
  name: string;
  /** One sentence. */
  description: string;
  /** Square logo, e.g. "/logos/test-agent.png". Falls back to initials when omitted. */
  logo?: string;
  languages: string[];
  /** GitHub repo. Clicking the card opens this. */
  repo: string;
  /** Set to true only when the project is deployed. Controls the "See Project" button. */
  live: boolean;
  /** Deployed site. Only used when `live` is true. */
  url?: string;
}

export interface Job {
  id: string;
  role: string;
  org: string;
  period: string;
  summary: string;
  details: string[];
  tags: string[];
}

export interface Course {
  code: string;
  name: string;
  description: string;
  /** The portfolio project built for this course. */
  project?: Project;
}

export type Year = '2023' | '2024' | '2025';

export interface SkillGroup {
  id: string;
  title: string;
  color: string;
  items: string[];
}

export interface SoftSkill {
  title: string;
  blurb: string;
}
