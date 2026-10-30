import type { ExperienceEntry, Project } from '@/types/portfolio';
import { ArrowIcon } from '@/components/icons';

export function ExperiencePage({
  job,
  entries,
}: {
  job: ExperienceEntry;
  entries: ExperienceEntry[];
}) {
  const index = entries.findIndex((entry) => entry.id === job.id);
  const previous = entries[index - 1];
  const next = entries[index + 1];

  return (
    <main className="full">
      <a className="full-back" href="/?open=experience">Back to the portfolio</a>
      <article>
        <p className="full-period">{job.period}</p>
        <h1>{job.role}</h1>
        <p className="full-org">{job.org}</p>
        <p className="full-summary">{job.description}</p>
        {job.tags.length > 0 && (
          <ul className="full-tags" aria-label="Tags">
            {job.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
      </article>
      <nav className="full-nav" aria-label="Other experience">
        {previous ? <a href={`/?experience=${previous.id}`}>Newer: {previous.role}</a> : <span />}
        {next ? <a href={`/?experience=${next.id}`}>Older: {next.role}</a> : <span />}
      </nav>
    </main>
  );
}

export function ProjectPage({ project }: { project: Project }) {
  return (
    <main className="full">
      <a className="full-back" href="/?open=projects">Back to projects</a>
      <article>
        {project.logo && <img className="project-page-logo" src={project.logo} alt="" />}
        <h1>{project.name}</h1>
        <p className="full-summary">{project.description}</p>
        {project.fullPageContent && (
          <div className="project-page-content">{project.fullPageContent}</div>
        )}
        {project.images.length > 0 && (
          <div className="project-page-images">
            {project.images.map((image) => (
              <img key={image.url} src={image.url} alt={image.alt} loading="lazy" />
            ))}
          </div>
        )}
        {[...project.languages, ...project.tags].length > 0 && (
          <ul className="full-tags" aria-label="Technologies and tags">
            {[...project.languages, ...project.tags].map((tag, index) => (
              <li key={`${tag}-${index}`}>{tag}</li>
            ))}
          </ul>
        )}
        <div className="project-page-links">
          {project.githubAvailable && project.repo && (
            <a className="expand-link" href={project.repo} target="_blank" rel="noopener noreferrer">
              GitHub repository <ArrowIcon />
            </a>
          )}
          {project.live && project.url && (
            <a className="expand-link" href={project.url} target="_blank" rel="noopener noreferrer">
              Live demo <ArrowIcon />
            </a>
          )}
        </div>
      </article>
    </main>
  );
}
