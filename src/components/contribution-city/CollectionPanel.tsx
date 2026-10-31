import type { CityIsland, PortfolioData } from '@/components/contribution-city/portfolio-types';

type CollectionItem = {
  id: string | number;
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  link?: string;
};

export function collectionFor(island: CityIsland, portfolio: PortfolioData): CollectionItem[] {
  if (island.kind === 'projects') {
    return portfolio.projects.map((project) => ({
      id: project.id,
      title: project.name,
      subtitle: project.languages.join(' · '),
      description: project.description,
      tags: project.tags,
      link: project.githubAvailable ? project.repo : undefined,
    }));
  }
  if (island.kind === 'courses') {
    return Object.entries(portfolio.courses).flatMap(([year, courses]) =>
      courses.map((course) => ({
        id: course.code,
        title: course.name,
        subtitle: `${course.code} · ${year.replace('y', 'Year ')}`,
        description: course.description,
        tags: course.tags,
      })),
    );
  }
  return portfolio.experiences.map((experience) => ({
    id: experience.id,
    title: experience.title,
    subtitle: `${experience.organisation} · ${experience.startDate.slice(0, 4)}`,
    description: experience.summary,
    tags: experience.tags,
  }));
}

export function CollectionPanel({
  island,
  items,
  onClose,
}: {
  island: CityIsland;
  items: CollectionItem[];
  onClose: () => void;
}) {
  return (
    <section className="cc-drawer-content">
      <header className="cc-drawer-head">
        <div>
          <h2 className="cc-drawer-title">{island.name}</h2>
          <p className="cc-drawer-sub">{island.subtitle || `Explore ${island.name.toLowerCase()}.`}</p>
        </div>
        <button type="button" className="cc-x" onClick={onClose} aria-label={`Close ${island.name} panel`}>
          &times;
        </button>
      </header>
      <ul className="cc-cards">
        {items.map((item) => (
          <li className="cc-card" key={item.id}>
            <span className="cc-eyebrow">{item.subtitle}</span>
            <strong className="cc-tl-title">{item.title}</strong>
            {item.description && <span className="cc-text">{item.description}</span>}
            {item.tags && item.tags.length > 0 && (
              <span className="cc-chips">
                {item.tags.map((tag) => <span className="cc-chip" key={tag}>{tag}</span>)}
              </span>
            )}
            {item.link && (
              <a className="cc-link" href={item.link} target="_blank" rel="noopener noreferrer">
                Open link ↗
              </a>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="cc-empty">Add {island.name.toLowerCase()} in Django Admin to populate this island.</li>}
      </ul>
    </section>
  );
}
