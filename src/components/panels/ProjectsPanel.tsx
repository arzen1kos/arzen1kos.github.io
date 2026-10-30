import { useMemo, useState } from 'react';
import { projects } from '../../data/projects';
import ProjectCard from '../ProjectCard';

/** false: show projects that use ANY selected language. true: only projects that use ALL of them. */
const MATCH_ALL = false;

export default function ProjectsPanel() {
  const [selected, setSelected] = useState<string[]>([]);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects)
      for (const language of project.languages) counts.set(language, (counts.get(language) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, []);

  const visible = useMemo(() => {
    if (selected.length === 0) return projects;
    return projects.filter((p) =>
      MATCH_ALL ? selected.every((l) => p.languages.includes(l)) : selected.some((l) => p.languages.includes(l)),
    );
  }, [selected]);

  const toggle = (language: string) =>
    setSelected((cur) => (cur.includes(language) ? cur.filter((l) => l !== language) : [...cur, language]));

  return (
    <section className="panel" aria-labelledby="projects-title">
      <header className="panel-head">
        <h2 id="projects-title">Projects</h2>
        <p>Select a card to open its GitHub repository.</p>
      </header>

      <div className="filters" role="group" aria-label="Filter projects by language">
        <button type="button" className="chip" aria-pressed={selected.length === 0} onClick={() => setSelected([])}>
          All <span>{projects.length}</span>
        </button>
        {languages.map(([language, count]) => (
          <button key={language} type="button" className="chip" aria-pressed={selected.includes(language)} onClick={() => toggle(language)}>
            {language} <span>{count}</span>
          </button>
        ))}
      </div>

      <p className="filter-status" role="status">Showing {visible.length} of {projects.length}</p>

      {visible.length > 0 ? (
        <div className="project-grid">
          {visible.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      ) : (
        <p className="filter-empty">
          No project uses {MATCH_ALL ? 'all of' : 'any of'} those languages.{' '}
          <button type="button" className="link-btn" onClick={() => setSelected([])}>Clear filters</button>
        </p>
      )}
    </section>
  );
}