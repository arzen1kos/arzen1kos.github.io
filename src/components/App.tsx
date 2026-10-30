import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { courses, years } from '../data/courses';
import { experience } from '../data/experience';
import { site } from '../data/site';
import { withBase } from '../lib/url';
import { CollapseIcon, ExperienceIcon, GithubIcon, LinkedInIcon, ProjectsIcon, SkillsIcon } from './icons';
import CoursesPanel from './panels/CoursesPanel';
import ExperiencePanel from './panels/ExperiencePanel';
import ProjectsPanel from './panels/ProjectsPanel';
import SkillsPanel from './panels/SkillsPanel';
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
} from './tree';
import GithubCard from './GithubCard';

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
  // `pinned` is the path of nodes the visitor has clicked open, e.g. ['root', 'grad', 'y2024'].
  const [pinned, setPinned] = useState<NodeId[]>([]);
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const [angles, setAngles] = useState(pickAngles);
  const [side, setSide] = useState<Side>('left');
  const [activeJob, setActiveJob] = useState(experience[0]?.id ?? '');
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
    <div className="app" data-mode={panel ? 'panel' : 'home'} data-side={side}>
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
                  <img src={withBase(site.avatar)} alt="Arsenie, profile picture" />
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

            {/* {hovered === 'projects' && <GithubCard />} */}
            {/* {peeksEnabled && hovered === 'projects' && <GithubCard />} */}
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
              <a href={site.github.url} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
                <GithubIcon />
                {/* <GithubCard/> */}
              </a>
              <a href={site.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
                <LinkedInIcon />
              </a>
            </div>
            <div className="grad-wrap" onMouseEnter={() => hoverIn('grad')} onMouseLeave={hoverOut}>
              <button
                type="button"
                className="grad"
                aria-expanded={pinned.includes('grad')}
                onClick={() => toggle('grad')}
              >
                🎓 {site.graduation.date} | {site.graduation.school}
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
                        {year}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            
          </div>
        </div>
      </aside>

      {panel && (
        <main className="content" data-panel={panel} key={panel}>
          {panel === 'projects' && <ProjectsPanel />}
          {panel === 'skills' && <SkillsPanel />}
          {panel === 'experience' && <ExperiencePanel activeId={activeJob} onSelect={setActiveJob} />}
          {(panel === 'y2023' || panel === 'y2024' || panel === 'y2025') && (
            <CoursesPanel year={YEAR_OF[panel]} />
          )}
        </main>
      )}
    </div>
  );
}
function HoverCard({ node }: { node: NodeId | null }) {
  switch (node) {
    case 'y2023':
    case 'y2024':
    case 'y2025': return <YearPeek year={YEAR_OF[node]} />;
    default: return null;
  }
}

function YearPeek({ year }: { year: keyof typeof courses }) {
  return (
    <div className="peek">
      <p className="peek-title">{year} courses</p>
      <ul>
        {courses[year].map((course) => (
          <li key={course.code}>
            {course.name}
            <b>{course.code}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
