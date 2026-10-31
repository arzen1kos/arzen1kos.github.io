import { useMemo } from 'react';
import type { ExperienceEntry, ExperienceMountain } from '@/components/contribution-city/types';

const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function formatDate(value: string | null): string {
  if (!value) return 'Present';
  return dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function formatRange(entry: ExperienceEntry): string {
  return `${formatDate(entry.startDate)} – ${formatDate(entry.endDate)}`;
}

export function ExperiencePanel({
  mountain,
  experiences,
  selectedId,
  onSelect,
  onExpand,
  onClose,
}: {
  mountain: ExperienceMountain | null;
  experiences: ExperienceEntry[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onExpand: (id: number) => void;
  onClose: () => void;
}) {
  const selected = experiences.find((entry) => entry.id === selectedId) ?? experiences[0];
  const heading = mountain?.name ?? 'Experience';
  const subtitle = mountain?.subtitle || 'Select a flag or role to explore the trail.';
  const entries = useMemo(
    () => [...experiences].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [experiences],
  );

  return (
    <section className="cc-drawer-content">
      <header className="cc-drawer-head">
        <div>
          <h2 className="cc-drawer-title">{heading}</h2>
          <p className="cc-drawer-sub">{subtitle}</p>
        </div>
        <button type="button" className="cc-x" onClick={onClose} aria-label="Close experience panel">&times;</button>
      </header>

      <ol className="cc-tl">
        {entries.map((entry) => (
          <li className="cc-tl-item" key={entry.id}>
            <span className="cc-tl-node" aria-hidden="true" />
            <button
              type="button"
              className={`cc-tl-card${selected?.id === entry.id ? ' is-selected' : ''}`}
              aria-pressed={selected?.id === entry.id}
              onClick={() => onSelect(entry.id)}
            >
              <span className="cc-tl-date">{formatRange(entry)}</span>
              <span className="cc-tl-title">{entry.title}</span>
              <span className="cc-tl-org">
                {entry.organisation}{entry.location ? ` · ${entry.location}` : ''}
              </span>
              {entry.summary && <span className="cc-tl-sum">{entry.summary}</span>}
            </button>
          </li>
        ))}
        {entries.length === 0 && <li className="cc-empty">Add experience from the Django admin to place trail flags.</li>}
      </ol>

      {selected && (
        <>
          <article className="cc-selected-entry">
            <p className="cc-date">{formatRange(selected)}</p>
            <h3>{selected.title}</h3>
            <p className="cc-full-org">
              {selected.organisation}{selected.location ? ` · ${selected.location}` : ''}
            </p>
            {selected.summary && <p className="cc-text">{selected.summary}</p>}
            {selected.descriptionText && <p className="cc-text cc-pre">{selected.descriptionText}</p>}
            {selected.highlights && selected.highlights.length > 0 && (
              <ul className="cc-highlights">
                {selected.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
              </ul>
            )}
          </article>
          <footer className="cc-drawer-foot">
            <span className="cc-foot-title">{selected.title}</span>
            <button type="button" className="cc-btn" onClick={() => onExpand(selected.id)}>
              View details <span aria-hidden="true">↗</span>
            </button>
          </footer>
        </>
      )}
    </section>
  );
}

export function ExperienceFull({
  experience,
  onBack,
}: {
  experience: ExperienceEntry;
  onBack: () => void;
}) {
  return (
    <div className="cc-full" role="dialog" aria-modal="true" aria-labelledby="cc-full-title">
      <article className="cc-full-body">
        <button type="button" className="cc-btn cc-btn-ghost" onClick={onBack}>&larr; Back to the trail</button>
        <p className="cc-date">{formatRange(experience)}</p>
        <h2 id="cc-full-title" className="cc-full-title">{experience.title}</h2>
        <p className="cc-full-org">
          {experience.organisation}{experience.location ? ` · ${experience.location}` : ''}
        </p>
        {experience.summary && <p className="cc-full-sum">{experience.summary}</p>}
        {experience.descriptionText && <p className="cc-rich cc-pre">{experience.descriptionText}</p>}
        {experience.highlights && experience.highlights.length > 0 && (
          <ul className="cc-highlights">
            {experience.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
        )}
        {experience.tags && experience.tags.length > 0 && (
          <div className="cc-tags">
            {experience.tags.map((tag) => <span className="cc-capsule cc-capsule-sm" key={tag}>{tag}</span>)}
          </div>
        )}
      </article>
    </div>
  );
}
