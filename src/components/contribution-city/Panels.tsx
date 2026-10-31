import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { formatDate, formatMonth, formatNumber } from '@/lib/format';
import type { PanelState, PeakKey, Portfolio, Repo, RepoLanguage } from './types';

const ADMIN_URL: string = import.meta.env.PUBLIC_DJANGO_ADMIN_URL ?? '/admin/';

/* ---------- slow auto-scroll: starts after a pause, yields to the reader ---------- */

function useAutoScroll(ref: RefObject<HTMLDivElement | null>, resetKey: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.scrollTop = 0;
    const SPEED = 14; // px per second
    let raf = 0, last = performance.now(), pausedUntil = last + 2500, endAt = 0, acc = 0, hovering = false;
    const bump = () => { pausedUntil = performance.now() + 5000; };
    const enter = () => { hovering = true; };
    const leave = () => { hovering = false; bump(); };
    el.addEventListener('wheel', bump, { passive: true });
    el.addEventListener('touchstart', bump, { passive: true });
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 2 && !hovering && now > pausedUntil) {
        if (el.scrollTop >= max - 1) {
          if (!endAt) endAt = now;
          if (now - endAt > 2500) { el.scrollTop = 0; endAt = 0; acc = 0; pausedUntil = now + 2500; }
        } else {
          acc += SPEED * dt;
          const step = Math.floor(acc);
          if (step > 0) { el.scrollTop += step; acc -= step; }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', bump);
      el.removeEventListener('touchstart', bump);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, [ref, resetKey]);
}

function Shell({ id, children, footer }: { id: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useAutoScroll(ref, id);
  return (
    <aside className="cc-panel">
      <div className="cc-scroll" ref={ref}>{children}</div>
      {footer}
    </aside>
  );
}

/* ---------- small parts ---------- */

function LockLink() {
  return (
    <a className="cc-lock" href={ADMIN_URL} aria-label="Edit portfolio content" rel="noreferrer">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" fill="#f3f3fd"/>
        <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </a>
  );
}

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

function DefaultPanel({ portfolio, repos, tokenMissing, onSelectPeak }: {
  portfolio: Portfolio;
  repos: Repo[];
  tokenMissing: boolean;
  onSelectPeak: (key: PeakKey) => void;
}) {
  const stats = useMemo(() => {
    const commits = repos.reduce((s, r) => s + r.commits, 0);
    const counts = new Map<string, { n: number; color: string | null }>();
    for (const r of repos) {
      if (!r.primaryLanguage) continue;
      const cur = counts.get(r.primaryLanguage) ?? { n: 0, color: r.languages[0]?.color ?? null };
      counts.set(r.primaryLanguage, { ...cur, n: cur.n + 1 });
    }
    return {
      commits,
      accounts: new Set(repos.map((r) => r.account)).size,
      priv: repos.filter((r) => r.isPrivate).length,
      archived: repos.filter((r) => r.isArchived).length,
      top: [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6),
    };
  }, [repos]);

  return (
    <Shell id="default">
      <h1 className="cc-title">{portfolio.profile.name}<LockLink /></h1>
      {portfolio.profile.headline && <p className="cc-lead">{portfolio.profile.headline}</p>}
      {portfolio.profile.bio && <p className="cc-body">{portfolio.profile.bio}</p>}
      <p className="cc-big">{formatNumber(stats.commits)}<span> commits across {repos.length} repositories</span></p>
      <dl className="cc-stats">
        <div><dt>Accounts</dt><dd>{stats.accounts}</dd></div>
        <div><dt>Private</dt><dd>{stats.priv}</dd></div>
        <div><dt>Archived</dt><dd>{stats.archived}</dd></div>
      </dl>
      <h2 className="cc-h2">Main languages</h2>
      <ul className="cc-langlist">
        {stats.top.map(([name, v]) => <li key={name}><i style={{ background: v.color ?? '#8aa0b4' }} />{name}<span>{v.n} repos</span></li>)}
      </ul>
      {tokenMissing && <p className="cc-note">No GitHub tokens are configured. Add GITHUB_TOKEN_* values to the server environment to load repositories.</p>}
      {!tokenMissing && repos.length === 0 && <p className="cc-note">No repositories were returned by GitHub. Check the server logs for account errors.</p>}
    </Shell>
  );
}

/* ---------- repo ---------- */

function RepoPanel({ repo }: { repo: Repo }) {
  const status = repo.isArchived ? 'Archived' : repo.isPrivate ? 'Private' : 'Public';
  return (
    <Shell id={`repo:${repo.id}`}>
      <p className="cc-meta">{repo.account} · {status}</p>
      <div className="cc-title-btn-group">
        <a className="cc-btn" href={repo.url} target="_blank" rel="noreferrer"><img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github-light.png"></img></a>
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

function SkillsPanel({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Shell id="skills">
      <h1 className="cc-title">Tech skills</h1>
      <div className="cc-skillgrid">
        {portfolio.skillCategories.map((c) => (
          <section key={c.id} className="cc-skillcat" style={{ '--c': c.color } as CSSProperties}>
            <h2><i className="cc-hexdot" />{c.name}</h2>
            <ul>{c.skills.map((s) => <li key={s}>
              <img width="23rem" src={s}></img>
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

function ExperiencePanel({ portfolio }: { portfolio: Portfolio }) {
  const items = portfolio.experience;
  const [sel, setSel] = useState<number | null>(items[0]?.id ?? null);
  const current = items.find((e) => e.id === sel);
  return (
    <Shell
      id="experience"
      // footer={current && (
      //   <div className="cc-footer">
      //     <span>{current.title}</span>
      //     <a className="cc-btn cc-btn-inline" href={`/experience/${current.id}`}>Expand <span aria-hidden>↗</span></a>
      //   </div>
      // )}
    >
      <h1 className="cc-title">Experience</h1>
      <p className="cc-lead">Select an entry, then expand it for the full page.</p>
      <ol className="cc-timeline">
        {items.map((e) => (
          <li key={e.id}>
            <i className="cc-hexdot cc-hexdot-ink" />
            <button type="button" className={e.id === sel ? 'is-selected' : ''} aria-pressed={e.id === sel} onClick={() => setSel(e.id)}>
              <div className="cc-exp-context">
                <span className="cc-muted">{formatMonth(e.startDate)} – {e.endDate ? formatMonth(e.endDate) : 'Present'}</span>
                <span>|</span>
                <em>{e.organisation}</em>
              </div>
              <a className="cc-btn cc-btn-inline" href={`/experience/${e.id}`}>
                <strong>{e.title}</strong>
              </a>
              <span>{e.summary}</span>
            </button>
          </li>
        ))}
      </ol>
    </Shell>
  );
}

/* ---------- projects ---------- */

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function ProjectsPanel({ portfolio }: { portfolio: Portfolio }) {
  const [lang, setLang] = useState<string | null>(null);
  const projects = portfolio.projects;
  const langs = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => p.languages.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);
  const shown = lang ? projects.filter((p) => p.languages.includes(lang)) : projects;

  return (
    <Shell id="projects">
      <h1 className="cc-title">Projects</h1>
      <p className="cc-lead">Select a card to open its GitHub repository.</p>
      <div className="cc-chips" role="group" aria-label="Filter by language">
        <button type="button" className={lang === null ? 'is-on' : ''} onClick={() => setLang(null)}>All <small>{projects.length}</small></button>
        {langs.map(([l, n]) => (
          <button key={l} type="button" className={lang === l ? 'is-on' : ''} onClick={() => setLang(l)}>{l} <small>{n}</small></button>
        ))}
      </div>
      <p className="cc-muted">Showing {shown.length} of {projects.length}</p>
      <div className="cc-cards">
        {shown.map((p) => {
          const inner = (
            <>
              <span className="cc-badge" style={{ background: p.color }}>{initials(p.displayName)}</span>
              <h2>{p.displayName}</h2>
              <p>{p.description}</p>
              <ul>{p.languages.map((l) => <li key={l}>{l}</li>)}</ul>
              {p.url && <span className="cc-btn">See Project <span aria-hidden>↗</span></span>}
            </>
          );
          return p.url
            ? <a key={p.id} className="cc-card" href={p.url} target="_blank" rel="noreferrer">{inner}</a>
            : <div key={p.id} className="cc-card">{inner}</div>;
        })}
      </div>
    </Shell>
  );
}

/* ---------- router ---------- */

export function Panel({ state, portfolio, repos, tokenMissing, onSelectPeak }: {
  state: PanelState;
  portfolio: Portfolio;
  repos: Repo[];
  tokenMissing: boolean;
  onSelectPeak: (key: PeakKey) => void;
}) {
  switch (state.kind) {
    case 'repo': return <RepoPanel key={state.repo.id} repo={state.repo} />;
    case 'skills': return <SkillsPanel portfolio={portfolio} />;
    case 'experience': return <ExperiencePanel portfolio={portfolio} />;
    case 'projects': return <ProjectsPanel portfolio={portfolio} />;
    default: return <DefaultPanel portfolio={portfolio} repos={repos} tokenMissing={tokenMissing} onSelectPeak={onSelectPeak} />;
  }
}
