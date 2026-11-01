export type CourseYear = 'y1' | 'y2' | 'y3';

export interface Project {
  id: number;
  name: string;
  description: string;
  fullPageContent: string;
  logo: string;
  languages: string[];
  tags: string[];
  images: Array<{ url: string; alt: string }>;
  repo: string;
  live: boolean;
  url: string;
  githubAvailable: boolean;
}

export interface Course {
  code: string;
  name: string;
  description: string;
  tags: string[];
  projects: Project[];
}

export interface ExperienceEntry {
  id: number;
  role: string;
  org: string;
  period: string;
  startYear: number;
  endYear: number | null;
  summary: string;
  description: string;
  details: string[];
  tags: string[];
}

export interface SkillCategory {
  id: number;
  title: string;
  kind: 'tech' | 'soft';
  color: string;
  items: string[];
  skills: Array<{ id: number; name: string; description: string }>;
}

export interface PortfolioSnapshot {
  site: {
    name: string;
    avatar: string;
    specialisation: string[];
    graduation: { date: string; school: string };
    github: { user: string; url: string };
    linkedin: string;
  };
  courses: Record<CourseYear, Course[]>;
  years: CourseYear[];
  projects: Project[];
  techSkills: SkillCategory[];
  softSkills: Array<{ id: number; title: string; blurb: string }>;
  experience: ExperienceEntry[];
}
