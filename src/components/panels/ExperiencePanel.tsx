import { experience } from '../../data/experience';
import { withBase } from '../../lib/url';
import { ArrowIcon } from '../icons';

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function ExperiencePanel({ activeId, onSelect }: Props) {
  const active = experience.find((job) => job.id === activeId) ?? experience[0];

  return (
    <section className="exp" aria-labelledby="exp-title">
      <header className="exp-head">
        <h2 id="exp-title">Experience</h2>
        <p>Select an entry, then expand it for the full page.</p>
      </header>

      <ol className="timeline" tabIndex={0} aria-label="Experience timeline, scrollable">
        {experience.map((job) => (
          <li key={job.id} className="tl-item" data-active={job.id === active?.id}>
            <span className="tl-dot" aria-hidden="true" />
            <button
              type="button"
              className="tl-card"
              aria-pressed={job.id === active?.id}
              onClick={() => onSelect(job.id)}
            >
              <time>{job.period}</time>
              <h3>{job.role}</h3>
              <p className="tl-org">{job.org}</p>
              <p className="tl-summary">{job.summary}</p>
            </button>
          </li>
        ))}
      </ol>

      {active && (
        <footer className="exp-foot">
          <span className="exp-foot-title">{active.role}</span>
          <a className="expand-link" href={withBase(`/experience/${active.id}/`)}>
            Expand
            <ArrowIcon />
          </a>
        </footer>
      )}
    </section>
  );
}
