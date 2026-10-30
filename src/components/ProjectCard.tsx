import type { CSSProperties } from 'react';
import type { Project } from '@/types/portfolio';
import { ArrowIcon } from '@/components/icons';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function Shield({ name }: { name: string }) {
  return <li className="shield">{name}</li>;
}

interface Props {
  project: Project;
  /** Smaller layout, used for the project nested inside a course card. */
  compact?: boolean;
}

export default function ProjectCard({ project, compact = false }: Props) {
  const showButton = project.live && Boolean(project.url);
  const hue = (project.name.length * 47) % 360;
  const logoStyle = { '--hue': hue } as CSSProperties;

  return (
    <article className={compact ? 'pcard pcard--compact' : 'pcard'}>
      <div className="pcard-logo" style={logoStyle}>
        {project.logo ? <img src={project.logo} alt="" /> : <span>{initials(project.name)}</span>}
      </div>
      <div className="pcard-body">
        <h3 className="pcard-name">
          <a className="pcard-link" href={`/?project=${project.id}`}>
            {project.name}
            <span className="sr-only"> (project details)</span>
          </a>
        </h3>
        <p className="pcard-desc">{project.description}</p>
        <ul className="shields" aria-label="Languages">
          {project.languages.map((language) => (
            <Shield key={language} name={language} />
          ))}
        </ul>
        {showButton && (
          <a className="pcard-btn" href={project.url} target="_blank" rel="noopener noreferrer">
            See Project
            <ArrowIcon />
          </a>
        )}
        {project.githubAvailable && project.repo && (
          <a
            className="pcard-btn pcard-btn--github"
            href={project.repo}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        )}
      </div>
    </article>
  );
}
