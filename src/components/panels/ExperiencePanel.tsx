import { usePortfolio } from '@/data/portfolio-context';
import { ArrowIcon } from '@/components/icons';

interface Props {
  activeId: number | null;
  onSelect: (id: number) => void;
}

export default function ExperiencePanel({ activeId, onSelect }: Props) {
  const { data } = usePortfolio();
  const experience = data?.experience ?? [];
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
      {experience.length === 0 && (
        <p className="filter-empty">No experience has been added yet. Sign in to add experience cards.</p>
      )}

      {active && (
        <footer className="exp-foot">
          <span className="exp-foot-title">{active.role}</span>
          <a className="expand-link" href={`/?experience=${active.id}`}>
            Expand
            <ArrowIcon />
          </a>
        </footer>
      )}
    </section>
  );
}
