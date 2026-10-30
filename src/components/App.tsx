import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePortfolio, PortfolioProvider } from '@/data/portfolio-context';
import type { CourseYear } from '@/types/portfolio';
import { CollapseIcon, ExperienceIcon, GithubIcon, LinkedInIcon, ProjectsIcon, SkillsIcon } from '@/components/icons';
import CoursesPanel from '@/components/panels/CoursesPanel';
import ExperiencePanel from '@/components/panels/ExperiencePanel';
import ProjectsPanel from '@/components/panels/ProjectsPanel';
import SkillsPanel from '@/components/panels/SkillsPanel';
import {
  HEX_IDS,
  LABELS,
  NODE_OF_YEAR,
  PANEL_NODES,
  YEAR_OF,
  pathOf,
  pickAngles,
  type HexId,
  type NodeId,
  type YearNodeId,
} from '@/components/tree';
import { ExperiencePage, ProjectPage } from '@/components/ExperiencePage';

const INTRO_DELAY_MS = 1000;
const HOVER_LEAVE_MS = 160;

const HEX_ICONS = { projects: ProjectsIcon, skills: SkillsIcon, experience: ExperienceIcon } as const;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const isHex = (id: NodeId): id is HexId => (HEX_IDS as NodeId[]).includes(id);

type Side = 'left' | 'right';

/** The tree sits on the side opposite the clicked node, so that node faces the panel. */
function treeSideFor(angle: number): Side {
  return Math.cos(toRad(angle)) > 0 ? 'left' : 'right';
}
const MOTTO = 'PER ASPERA AD ASTRA';
// Non-breaking spaces stop the SVG from collapsing the gaps between repeats.
const RING_TEXT = Array(5).fill(`${MOTTO}\u00A0\u00A0·\u00A0\u00A0`).join('');

function MottoRing() {
  return (
    <svg className="motto" viewBox="-120 -120 240 240" aria-hidden="true">
      <defs>
        {/* Flat-top hexagon, circumradius 108 (the root is 100), so it sits just outside the root */}
        <path id="motto-path" d="M108 0 L54 93.5 L-54 93.5 L-108 0 L-54 -93.5 L54 -93.5 Z" />
      </defs>
      <text>
        <textPath href="#motto-path" textLength="645" lengthAdjust="spacing">
          {RING_TEXT}
        </textPath>
      </text>
    </svg>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <PortfolioContent />
    </PortfolioProvider>
  );
}

function PortfolioContent() {
  const { data, loading, error } = usePortfolio();
  if (loading) return <p className="app-status" role="status">Loading portfolio…</p>;
  if (error || !data) {
    return <p className="app-status app-status--error" role="alert">Could not load portfolio: {error}</p>;
  }

  return <LoadedPortfolio data={data} />;
}

function LoadedPortfolio({ data }: { data: NonNullable<ReturnType<typeof usePortfolio>['data']> }) {
  const { site, years, experience } = data;
  // `pinned` is the path of nodes the visitor has clicked open, e.g. ['root', 'grad', 'y2'].
  const [pinned, setPinned] = useState<NodeId[]>([]);
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const [angles, setAngles] = useState(pickAngles);
  const [side, setSide] = useState<Side>('left');
  const [activeJob, setActiveJob] = useState<number | null>(experience[0]?.id ?? null);
  const leaveTimer = useRef<number | undefined>(undefined);

  // After X seconds the child nodes appear. `?open=skills` (used by the full-page back links) skips ahead.
  useEffect(() => {
    const open = new URLSearchParams(window.location.search).get('open');
    if (open === 'projects' || open === 'skills' || open === 'experience') {
      setPinned(pathOf(open));
      setSide(treeSideFor(angles[open]));
      return;
    }
    const timer = window.setTimeout(() => setPinned((current) => (current.length ? current : ['root'])), INTRO_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once everything has collapsed back to the root, shuffle which sides the children will use next time.
  useEffect(() => {
    if (pinned.length > 0) return;
    const timer = window.setTimeout(() => setAngles(pickAngles()), 900);
    return () => window.clearTimeout(timer);
  }, [pinned.length]);

  const active = pinned[pinned.length - 1];
  const panel: NodeId | null = active && PANEL_NODES.has(active) ? active : null;
  const peeksEnabled = !panel;
  const params = new URLSearchParams(window.location.search);
  const experienceId = Number(params.get('experience') ?? window.location.pathname.match(/^\/experience\/(\d+)\/?$/)?.[1]);
  const experiencePage = Number.isInteger(experienceId)
    ? experience.find((entry) => entry.id === experienceId)
    : undefined;
  const projectId = Number(params.get('project'));
  const projectPage = Number.isInteger(projectId)
    ? data.projects.find((project) => project.id === projectId)
    : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [panel]);

  const hoverIn = useCallback((id: NodeId) => {
    window.clearTimeout(leaveTimer.current);
    setHovered(id);
  }, []);

  const hoverOut = useCallback(() => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHovered(null), HOVER_LEAVE_MS);
  }, []);

  /** Click: pin a node, or unpin it (which collapses everything below it). Opening one closes other branches. */
  const toggle = (id: NodeId) => {
    setPinned((current) => {
      const index = current.indexOf(id);
      return index === -1 ? pathOf(id) : current.slice(0, index);
    });
    if (isHex(id)) setSide(treeSideFor(angles[id]));
  };

  const collapseAll = () => {
    window.clearTimeout(leaveTimer.current);
    setHovered(null);
    setPinned([]);
  };

  // A node shows its children while pinned or hovered (hovering a child keeps its ancestors open).
  const reveal = new Set<NodeId>([...pinned, ...(hovered ? pathOf(hovered) : [])]);
  const hexVisible = reveal.has('root');
  const capsulesVisible = reveal.has('grad');
  const rootOpen = pinned.includes('root');

  return (
    <div className="app" data-mode={panel || experiencePage ? 'panel' : 'home'} data-side={side}>
      <AdminAccess />
      {experiencePage ? (
        <ExperiencePage job={experiencePage} entries={experience} />
      ) : projectPage ? (
        <ProjectPage project={projectPage} />
      ) : (
      <>
      <aside className="stage" aria-label="Portfolio navigation">
        {pinned.length > 0 && (
          <button type="button" className="collapse-btn" onClick={collapseAll}>
            <CollapseIcon />
            Collapse all
          </button>
        )}

        <div className="tree">
          <div className="root-wrap">
            <MottoRing /> 
            {HEX_IDS.map((id, index) => (
              <span
                key={id}
                className="link"
                data-visible={hexVisible}
                aria-hidden="true"
                style={{ '--a': angles[id], '--i': index } as CSSProperties}
              />
            ))}

            <div
              className="hexwrap root-hex"
              data-open={rootOpen}
              onMouseEnter={() => hoverIn('root')}
              onMouseLeave={hoverOut}
            >
              <button
                type="button"
                className="hexbtn"
                aria-expanded={rootOpen}
                aria-label={rootOpen ? 'Collapse the portfolio tree' : 'Expand the portfolio tree'}
                onClick={() => toggle('root')}
              >
                <span className="hex-in">
                  {site.avatar && <img src={site.avatar} alt={`${site.name || 'Profile'} profile`} />}
                </span>
              </button>
            </div>

            {HEX_IDS.map((id, index) => {
              const angle = angles[id];
              const Icon = HEX_ICONS[id];
              const pinnedHere = pinned.includes(id);
              const nodeStyle = {
                '--kx': Math.cos(toRad(angle)).toFixed(4),
                '--ky': (-Math.sin(toRad(angle))).toFixed(4),
                '--rfactor': 1.2,
                '--i': index,
              } as CSSProperties;

              return (
                <div
                  key={id}
                  className="node hexwrap"
                  data-id={id}
                  data-visible={hexVisible}
                  data-active={pinnedHere}
                  data-side={Math.cos(toRad(angle)) > 0 ? 'right' : 'left'}
                  style={nodeStyle}
                  onMouseEnter={() => hoverIn(id)}
                  onMouseLeave={hoverOut}
                >
                  <button
                    type="button"
                    className="hexbtn"
                    tabIndex={hexVisible ? 0 : -1}
                    aria-expanded={pinnedHere}
                    aria-label={LABELS[id]}
                    onClick={() => toggle(id)}
                  >
                    <span className="hex-in">
                      <Icon />
                    </span>
                  </button>
                  <span className="node-label" aria-hidden="true">
                    {LABELS[id]}
                  </span>
                </div>
              );
            })}

            {peeksEnabled && <HoverCard node={hovered} />}
          </div>

          <div className="identity">
            <h1 className="name">{site.name}</h1>
            <p className="spec">
              {site.specialisation.map((item, index) => (
                <span key={item}>
                  {index > 0 && <span className="bar"> | </span>}
                  {item}
                </span>
              ))}
            </p>
            <div className="contacts">
              {site.github.url && (
                <a href={site.github.url} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
                  <GithubIcon />
                </a>
              )}
              {site.linkedin && (
                <a href={site.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
                  <LinkedInIcon />
                </a>
              )}
            </div>
            {(site.graduation.date || site.graduation.school || years.length > 0) && (
            <div className="grad-wrap" onMouseEnter={() => hoverIn('grad')} onMouseLeave={hoverOut}>
              <button
                type="button"
                className="grad"
                aria-expanded={pinned.includes('grad')}
                onClick={() => toggle('grad')}
              >
                🎓 {[site.graduation.date, site.graduation.school].filter(Boolean).join(' | ')}
              </button>

              <div className="capsules" data-visible={capsulesVisible}>
                {years.map((year, index) => {
                  const id: YearNodeId = NODE_OF_YEAR[year];
                  const pinnedHere = pinned.includes(id);
                  return (
                    <div
                      key={year}
                      className="capsule-wrap"
                      style={{ '--i': index } as CSSProperties}
                      onMouseEnter={() => hoverIn(id)}
                      onMouseLeave={() => hoverIn('grad')}
                    >
                      <button
                        type="button"
                        className="capsule"
                        data-active={pinnedHere}
                        tabIndex={capsulesVisible ? 0 : -1}
                        aria-expanded={pinnedHere}
                        onClick={() => toggle(id)}
                      >
                        {year.replace('y', 'Year ')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            
          </div>
        </div>
      </aside>

      {panel && (
        <main className="content" data-panel={panel} key={panel}>
          {panel === 'projects' && <ProjectsPanel />}
          {panel === 'skills' && <SkillsPanel />}
          {panel === 'experience' && <ExperiencePanel activeId={activeJob} onSelect={setActiveJob} />}
          {(panel === 'y1' || panel === 'y2' || panel === 'y3') && (
            <CoursesPanel year={YEAR_OF[panel]} />
          )}
        </main>
      )}
      </>
      )}
    </div>
  );
}
function HoverCard({ node }: { node: NodeId | null }) {
  switch (node) {
    case 'y1':
    case 'y2':
    case 'y3': return <YearPeek year={YEAR_OF[node]} />;
    default: return null;
  }
}

function YearPeek({ year }: { year: CourseYear }) {
  const { data } = usePortfolio();
  return (
    <div className="peek">
      <p className="peek-title">{year.replace('y', 'Year ')} courses</p>
      <ul>
        {(data?.courses[year] ?? []).map((course) => (
          <li key={course.code}>
            {course.name}
            <b>{course.code}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminAccess() {
  const [session, setSession] = useState<{ authenticated: boolean; username: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/session/')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Session API returned HTTP ${response.status}.`);
        return (await response.json()) as { authenticated: boolean; username: string | null };
      })
      .then(setSession)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Unable to check sign-in status.');
      });
  }, []);

  return (
    <nav className="admin-access" aria-label="Portfolio administration">
      {session?.authenticated ? (
        <>
          <span>Signed in as {session.username}</span>
          <button className="admin-button" type="button" onClick={() => window.location.reload()}>
            Refresh content
          </button>
          <a className="admin-button" href="/admin/">Edit portfolio</a>
        </>
      ) : (
        <a className="admin-button" href="/admin/login/?next=/admin/">Sign in to edit</a>
      )}
      {error && <span className="admin-error" role="status">{error}</span>}
    </nav>
  );
}
