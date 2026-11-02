import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatDate, formatMonth, formatNumber } from '@/lib/format';
import type { ContributionDay, ExperienceItem, GithubStats, PanelState, Portfolio, PortfolioSection, Repo, RepoLanguage } from './types';
import { useAutoScroll } from './useAutoScroll';
import { PROJECT_IMAGE_REGISTRY, DEFAULT_PROJECT } from '@/lib/repo-registry'; 

const IMAGE_REGISTRY = PROJECT_IMAGE_REGISTRY;
const DEFAULT = DEFAULT_PROJECT;

function Shell({ id, children, footer, activeSection, onSelectSection, autoScroll = true }: {
  id: string;
  children: ReactNode;
  footer?: ReactNode;
  activeSection: PortfolioSection;
  onSelectSection: (section: PortfolioSection) => void;
  autoScroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useAutoScroll(ref, id, autoScroll);
  return (
    <aside className="cc-panel">
      <nav className="cc-section-nav" aria-label="Portfolio sections">
        {([
          ['overview', 'Overview'],
          ['skills', 'Skills'],
          ['experience', 'Experience'],
          ['projects', 'Projects'],
        ] as const).map(([section, label]) => (
          <button
            key={section}
            type="button"
            aria-pressed={activeSection === section}
            onClick={() => onSelectSection(section)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="cc-scroll" ref={ref}>{children}</div>
      {footer}
    </aside>
  );
}

/* ---------- small parts ---------- */

function LangBar({ languages }: { languages: RepoLanguage[] }) {
  if (languages.length === 0) return <p className="cc-muted">No language data.</p>;
  return (
    <>
      <div className="cc-langbar" role="img" aria-label="Language breakdown">
        {languages.map((l) => <span key={l.name} style={{ flex: l.share, background: l.color ?? '#8aa0b4' }} />)}
      </div>
      <ul className="cc-langlist">
        {languages.map((l) => (
          <li key={l.name}><i style={{ background: l.color ?? '#8aa0b4' }} />{l.name}<span>{Math.round(l.share * 100)}%</span></li>
        ))}
      </ul>
    </>
  );
}

/* ---------- default ---------- */

function DefaultPanel({ portfolio, repos, github, onSelectSection }: {
  portfolio: Portfolio;
  repos: Repo[];
  github: GithubStats;
  onSelectSection: (section: PortfolioSection) => void;
}) {
  const stats = useMemo(() => {
    const commits = repos.reduce((s, r) => s + r.commits, 0);
    const followers = github.accounts.reduce((total, account) => total + account.followers, 0);
    const stars = github.accounts.reduce((total, account) => total + account.stars, 0);
    const forks = github.accounts.reduce((total, account) => total + account.forks, 0);
    const counts = new Map<string, { n: number; color: string | null }>();
    for (const r of repos) {
      if (!r.primaryLanguage) continue;
      const cur = counts.get(r.primaryLanguage) ?? { n: 0, color: r.languages[0]?.color ?? null };
      counts.set(r.primaryLanguage, { ...cur, n: cur.n + 1 });
    }
    return {
      commits,
      followers,
      stars,
      forks,
      archived: repos.filter((r) => r.isArchived).length,
      top: [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6),
    };
  }, [github.accounts, repos]);

  return (
    <Shell id="default" activeSection="overview" onSelectSection={onSelectSection}>
      <h1 className="cc-title">{portfolio.profile.name}</h1>
      <ul className="cc-github-accounts" aria-label="Linked GitHub accounts">
        {github.accounts.map((account) => (
          <li key={account.login}>
            <a className="cc-profile-link" href={account.profileUrl} target="_blank" rel="noreferrer">@{account.login} ↗</a>
            <span>{formatNumber(account.totalContributions)} contributions · {formatNumber(account.followers)} followers</span>
          </li>
        ))}
      </ul>
      {portfolio.profile.headline && <p className="cc-lead">{portfolio.profile.headline}</p>}
      {portfolio.profile.bio && <p className="cc-body">{portfolio.profile.bio}</p>}
      <p className="cc-big">{formatNumber(stats.commits)}<span> commits across {repos.length} public repositories from {github.accounts.length} accounts</span></p>
      <h2 className="cc-h2">Contribution activity</h2>
      <ContributionCalendar days={github.contributionDays} />
      <p className="cc-muted">Daily contributions over the past year</p>
      <h2 className="cc-h2">Main languages</h2>
      <ul className="cc-langlist">
        {stats.top.map(([name, v]) => <li key={name}><i style={{ background: v.color ?? '#8aa0b4' }} />{name}<span>{v.n} repos</span></li>)}
      </ul>
      {repos.length === 0 && <p className="cc-note">No public repositories were available for this build.</p>}
    </Shell>
  );
}

function ContributionCalendar({ days }: { days: ContributionDay[] }) {
  return (
    <div
      className="cc-contribution-grid"
      role="img"
      aria-label={`Contribution calendar with ${formatNumber(days.reduce((total, day) => total + day.count, 0))} contributions over the past year`}
    >
      {days.map((day) => (
        <span
          key={day.date}
          data-level={day.level}
          title={`${day.count} contributions on ${day.date}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/* ---------- repo ---------- */

function RepoPanel({ repo, onSelectSection }: {
  repo: Repo;
  onSelectSection: (section: PortfolioSection) => void;
}) {
  const status = repo.isArchived ? 'Archived' : repo.isPrivate ? 'Private' : 'Public';
  return (
    <Shell id={`repo:${repo.id}`} activeSection="overview" onSelectSection={onSelectSection}>
      <p className="cc-meta">{repo.account} · {status}</p>
      <div className="cc-title-btn-group">
        <a className="cc-btn repo-btn" href={repo.url} target="_blank" rel="noreferrer">
          <img src={(IMAGE_REGISTRY as Record<string, { image: string }>)[repo.name]?.image || DEFAULT.image}/>
        </a>
        <h1 className="cc-title">{repo.name}</h1>
      </div>
      <p className="cc-body">{repo.description ?? 'No description.'}</p>
      <p className="cc-big">{formatNumber(repo.commits)}<span> commits</span></p>
      <p className="cc-muted">Last pushed {formatDate(repo.pushedAt)}</p>
      <h2 className="cc-h2">Languages</h2>
      <LangBar languages={repo.languages} />
    </Shell>
  );
}

/* ---------- skills ---------- */

function SkillsPanel({ portfolio, onSelectSection }: {
  portfolio: Portfolio;
  onSelectSection: (section: PortfolioSection) => void;
}) {
  return (
    <Shell id="skills" activeSection="skills" onSelectSection={onSelectSection}>
      <h1 className="cc-title">Tech skills</h1>
      <div className="cc-skillgrid">
        {portfolio.skillCategories.map((c) => (
          <section key={c.id} className="cc-skillcat" style={{ '--c': c.color } as CSSProperties}>
            <h2><i className="cc-hexdot" />{c.name}</h2>
            <ul>{c.skills.map((s) => <li key={s} >
              <img src={s}></img>
            </li>)}</ul>
          </section>
        ))}
      </div>
      <h1 className="cc-title cc-title-gap">Soft skills</h1>
      <dl className="cc-soft">
        {portfolio.softSkills.map((s) => <div key={s.name}><dt>{s.name}</dt><dd>{s.description}</dd></div>)}
      </dl>
    </Shell>
  );
}

/* ---------- experience ---------- */

function ExperiencePanel({ portfolio, onSelectSection }: {
  portfolio: Portfolio;
  onSelectSection: (section: PortfolioSection) => void;
  autoScroll?: boolean;
}) {
  const items = portfolio.experience;
  const [selectedExperience, setSelectedExperience] = useState<ExperienceItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedExperience && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('.cc-dialog-close')?.focus();
    }
    else if (!selectedExperience && dialog.open) dialog.close();
  }, [selectedExperience]);

  return (
    <Shell id="experience" activeSection="experience" onSelectSection={onSelectSection} autoScroll={true}>
      <h1 className="cc-title">Experience</h1>
      <p className="cc-lead">Explore the roles and projects that shaped my work.</p>
      <ol className="cc-timeline">
        {items.map((e) => (
          <li key={e.id}>
            <i className="cc-hexdot cc-hexdot-ink" />
            <button
              type="button"
              className="cc-exp-trigger"
              aria-haspopup="dialog"
              aria-label={`Read more about ${e.title} at ${e.organisation}`}
              onClick={() => setSelectedExperience(e)}
            >
              <div className="cc-exp-context">
                <span className="cc-muted">{formatMonth(e.startDate)} – {e.endDate ? formatMonth(e.endDate) : 'Present'}</span>
                <span>|</span>
                <em>{e.organisation}</em>
              </div>
              <strong>{e.title}</strong>
              <span>{e.summary}</span>
            </button>
          </li>
        ))}
      </ol>
      <dialog
        ref={dialogRef}
        className="cc-dialog"
        aria-labelledby="cc-experience-title"
        onClose={() => setSelectedExperience(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        {selectedExperience && (
          <article className="cc-dialog-content">
            <header className="cc-dialog-header">
              <div>
                <p className="cc-dialog-meta">
                  {formatMonth(selectedExperience.startDate)} – {selectedExperience.endDate ? formatMonth(selectedExperience.endDate) : 'Present'}
                  {selectedExperience.location && ` · ${selectedExperience.location}`}
                </p>
                <h2 id="cc-experience-title">{selectedExperience.title}</h2>
                <p className="cc-dialog-org">{selectedExperience.organisation}</p>
              </div>
              <button
                type="button"
                className="cc-dialog-close"
                aria-label="Close experience details"
                autoFocus
                onClick={() => dialogRef.current?.close()}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            {selectedExperience.summary && <p className="cc-dialog-summary">{selectedExperience.summary}</p>}
            {selectedExperience.details.length > 0 && (
              <ul className="cc-dialog-details">
                {selectedExperience.details.map((detail, index) => <li key={`${selectedExperience.id}-${index}`}>{detail}</li>)}
              </ul>
            )}
          </article>
        )}
      </dialog>
    </Shell>
  );
}

/* ---------- projects ---------- */

/** false = every GitHub repo gets a card. true = only repos you have given a project row. */
const ONLY_RENAMED = false;
const EXCLUDED_REPOSITORIES = new Set([
  'arzen1kos/arzen1kos',
  'arzenik0s/arzenik0s',
].map((name) => name.toLowerCase()));

interface ProjectCard {
  key: string;
  name: string;
  description: string;
  languages: string[];
  color: string;
  url: string | null;
}

function ProjectsPanel({ portfolio, repos, onSelectSection }: {
  portfolio: Portfolio;
  repos: Repo[];
  onSelectSection: (section: PortfolioSection) => void;
}) {
  const [lang, setLang] = useState<string | null>(null);

  const cards = useMemo<ProjectCard[]>(() => {
    const byName = new Map(repos.map((r) => [r.fullName.toLowerCase(), r]));
    const claimed = new Set<string>();
    const out: ProjectCard[] = [];

    // 1. Your project rows, in your sort order. Linked ones take their data from the GitHub repo.
    for (const p of portfolio.projects) {
      if (p.repoFullName && EXCLUDED_REPOSITORIES.has(p.repoFullName.toLowerCase())) continue;
      const repo = p.repoFullName ? byName.get(p.repoFullName.toLowerCase()) : undefined;
      if (repo) claimed.add(repo.id);
      out.push({
        key: `p-${p.id}`,
        name: p.displayName,                                            // your custom name
        description: p.description || repo?.description || '',
        languages: p.languages.length ? p.languages : (repo?.languages.slice(0, 3).map((l) => l.name) ?? []),
        color: p.color,
        url: repo ? (repo.isPrivate ? null : repo.url) : p.url,
      });
    }

    // 2. Every other repo, most active first, under its GitHub name.
    if (!ONLY_RENAMED) {
      [...repos]
        .filter((r) => !claimed.has(r.id) && !EXCLUDED_REPOSITORIES.has(r.fullName.toLowerCase()))
        .sort((a, b) => b.commits - a.commits)
        .forEach((r) => out.push({
          key: `r-${r.id}`,
          name: r.name,
          description: r.description ?? '',
          languages: r.languages.slice(0, 3).map((l) => l.name),
          color: r.languages[0]?.color ?? '#2e7d32',
          url: r.isPrivate ? null : r.url,
        }));
    }
    return out;
  }, [portfolio.projects, repos]);

  const langs = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((c) => c.languages.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [cards]);

  const shown = lang ? cards.filter((c) => c.languages.includes(lang)) : cards;

  return (
    <Shell id="projects" activeSection="projects" onSelectSection={onSelectSection}>
      <h1 className="cc-title">Projects</h1>
      <p className="cc-lead">Select a card to open its GitHub repository.</p>
      <div className="cc-chips" role="group" aria-label="Filter by language">
        <button type="button" className={lang === null ? 'is-on' : ''} onClick={() => setLang(null)}>All <small>{cards.length}</small></button>
        {langs.map(([l, n]) => (
          <button key={l} type="button" className={lang === l ? 'is-on' : ''} onClick={() => setLang(l)}>{l} <small>{n}</small></button>
        ))}
      </div>
      <p className="cc-muted">Showing {shown.length} of {cards.length}</p>
      {shown.length === 0 ? <p className="cc-note">No public projects were found for this account.</p> : <div className="cc-cards">
        {shown.map((c) => {
          const inner = (
            <>
              <span className="cc-badge repo-btn">
                <img src={(IMAGE_REGISTRY as Record<string, { image: string }>)[c.name]?.image || DEFAULT.image}/>
              </span>
              <h2>{c.name}</h2>
              <p>{c.description}</p>
              <ul>{c.languages.map((l) => <li key={l}>{l}</li>)}</ul>
            </>
          );
          return c.url
            ? <a key={c.key} className="cc-card" href={c.url} target="_blank" rel="noreferrer">{inner}</a>
            : <div key={c.key} className="cc-card">{inner}</div>;
        })}
      </div>}
    </Shell>
  );
}

/* ---------- router ---------- */

export function Panel({ state, portfolio, repos, github, onSelectSection }: {
  state: PanelState;
  portfolio: Portfolio;
  repos: Repo[];
  github: GithubStats;
  onSelectSection: (section: PortfolioSection) => void;
}) {
  switch (state.kind) {
    case 'repo': return <RepoPanel key={state.repo.id} repo={state.repo} onSelectSection={onSelectSection} />;
    case 'skills': return <SkillsPanel portfolio={portfolio} onSelectSection={onSelectSection} />;
    case 'experience': return <ExperiencePanel portfolio={portfolio} onSelectSection={onSelectSection} />;
    case 'projects': return <ProjectsPanel portfolio={portfolio} repos={repos} onSelectSection={onSelectSection} />;
    default: return <DefaultPanel portfolio={portfolio} repos={repos} github={github} onSelectSection={onSelectSection} />;
  }
}
