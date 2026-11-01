import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const configuredPath = process.env.PORTFOLIO_DB_PATH ?? 'backend/db/portfolio.db';
const databasePath = path.resolve(root, configuredPath);
if (!existsSync(databasePath)) {
  throw new Error(`Portfolio database not found at ${databasePath}. Set PORTFOLIO_DB_PATH or run npm run db:setup.`);
}

const database = new Database(databasePath, { readonly: true });
try {
  const profile = database.prepare('SELECT name, headline, bio FROM profile WHERE id = 1').get()
    ?? { name: '', headline: '', bio: '' };
  const experience = database.prepare(
    'SELECT id, title, organisation, location, start_date, end_date, summary, details FROM experience WHERE visible = 1 ORDER BY start_date DESC, sort_order ASC',
  ).all().map((entry) => ({
    id: entry.id,
    title: entry.title,
    organisation: entry.organisation,
    location: entry.location,
    startDate: entry.start_date,
    endDate: entry.end_date,
    summary: entry.summary,
    details: entry.details.split('\n').map((line) => line.trim()).filter(Boolean),
  }));
  const categories = database.prepare(
    'SELECT id, name, color FROM skill_category ORDER BY sort_order, id',
  ).all();
  const skills = database.prepare(
    'SELECT category_id, name FROM skill ORDER BY sort_order, id',
  ).all();
  const softSkills = database.prepare(
    'SELECT name, description FROM soft_skill ORDER BY sort_order, id',
  ).all();
  const projects = database.prepare(
    'SELECT id, repo_full_name, display_name, description, languages, color FROM project WHERE visible = 1 ORDER BY sort_order, id',
  ).all().map((project) => ({
    id: project.id,
    repoFullName: project.repo_full_name,
    displayName: project.display_name,
    description: project.description,
    languages: project.languages.split(',').map((language) => language.trim()).filter(Boolean),
    color: project.color,
    url: null,
  }));

  const portfolio = {
    profile,
    experience,
    skillCategories: categories.map((category) => ({
      ...category,
      skills: skills.filter((skill) => skill.category_id === category.id).map((skill) => skill.name),
    })),
    softSkills,
    projects,
  };
  const outputPath = path.join(root, 'public', 'data', 'portfolio.json');
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(portfolio, null, 2)}\n`);
  console.log(`Exported public portfolio data to ${path.relative(root, outputPath)}.`);
} finally {
  database.close();
}
