import Database from 'better-sqlite3';
import type { ExperienceItem, Portfolio, ProjectItem, Repo } from '@/components/contribution-city/types';
import { PORTFOLIO_DB_PATH } from '@/lib/server-config';

let db: Database.Database | null = null;
function open(): Database.Database {
  if (!db) {
    db = new Database(PORTFOLIO_DB_PATH, { fileMustExist: true, timeout: 5000 });
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

interface ExperienceRow {
  id: number; title: string; organisation: string; location: string;
  start_date: string; end_date: string | null; summary: string; details: string;
}

const toExperience = (r: ExperienceRow): ExperienceItem => ({
  id: r.id, title: r.title, organisation: r.organisation, location: r.location,
  startDate: r.start_date, endDate: r.end_date, summary: r.summary,
  details: r.details.split('\n').map((s) => s.trim()).filter(Boolean),
});

export function getExperience(id: number): ExperienceItem | null {
  const row = open().prepare('SELECT * FROM experience WHERE id = ? AND visible = 1').get(id) as ExperienceRow | undefined;
  return row ? toExperience(row) : null;
}

export function getPortfolio(repos: Repo[]): Portfolio {
  const d = open();

  const profile = (d.prepare('SELECT name, headline, bio FROM profile WHERE id = 1').get() as Portfolio['profile'] | undefined)
    ?? { name: '', headline: '', bio: '' };

  const experience = (d.prepare(
    'SELECT * FROM experience WHERE visible = 1 ORDER BY start_date DESC, sort_order ASC',
  ).all() as ExperienceRow[]).map(toExperience);

  const cats = d.prepare('SELECT id, name, color FROM skill_category ORDER BY sort_order, id').all() as { id: number; name: string; color: string }[];
  const skillRows = d.prepare('SELECT category_id, name FROM skill ORDER BY sort_order, id').all() as { category_id: number; name: string }[];
  const skillCategories = cats.map((c) => ({ ...c, skills: skillRows.filter((s) => s.category_id === c.id).map((s) => s.name) }));

  const softSkills = d.prepare('SELECT name, description FROM soft_skill ORDER BY sort_order, id').all() as Portfolio['softSkills'];

  const byFullName = new Map(repos.map((r) => [r.fullName.toLowerCase(), r]));
  const projectRows = d.prepare('SELECT * FROM project WHERE visible = 1 ORDER BY sort_order, id').all() as {
    id: number; repo_full_name: string | null; display_name: string; description: string; languages: string; color: string;
  }[];
  const projects: ProjectItem[] = projectRows.map((p) => {
    const repo = p.repo_full_name ? byFullName.get(p.repo_full_name.toLowerCase()) : undefined;
    const manual = p.languages.split(',').map((s) => s.trim()).filter(Boolean);
    const detected = repo?.languages.slice(0, 3).map((l) => l.name) ?? [];
    return {
      repoFullName: p.repo_full_name,
      id: p.id,
      displayName: p.display_name,                       // your custom name, not the repo name
      description: p.description || repo?.description || '',
      languages: manual.length ? manual : detected,
      color: p.color,
      url: repo?.url ?? null,
    };
  });

  return { profile, experience, skillCategories, softSkills, projects };
}
