import { useCallback, useEffect, useRef, useState } from 'react';
import { CityScene } from './CityScene';
import { Panel } from './Panels';
import type { CityPayload, PanelState, PeakKey, PortfolioSection, Repo } from './types';
import './city.css';

export default function ContributionCity() {
  const [data, setData] = useState<CityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>({ kind: 'default' });
  const [hoverRepo, setHoverRepo] = useState<Repo | null>(null);
  const [hoverPeak, setHoverPeak] = useState<PeakKey | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/portfolio.json`, { signal: ac.signal }),
      fetch(`${base}data/repos.json`, { signal: ac.signal }),
      fetch(`${base}data/github.json`, { signal: ac.signal }),
    ])
      .then(async ([portfolioResponse, reposResponse, githubResponse]) => {
        if (!portfolioResponse.ok) {
          throw new Error(`Portfolio data returned HTTP ${portfolioResponse.status}.`);
        }
        if (!reposResponse.ok) {
          throw new Error(`Repository data returned HTTP ${reposResponse.status}.`);
        }
        if (!githubResponse.ok) {
          throw new Error(`GitHub statistics returned HTTP ${githubResponse.status}.`);
        }
        const [portfolio, repos, github] = await Promise.all([
          portfolioResponse.json() as Promise<CityPayload['portfolio']>,
          reposResponse.json() as Promise<CityPayload['repos']>,
          githubResponse.json() as Promise<CityPayload['github']>,
        ]);
        setData({ portfolio, repos, github });
      })
      .catch((reason: unknown) => {
        if (ac.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Unable to load portfolio data.');
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    document.body.style.cursor = hoverRepo || hoverPeak ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hoverRepo, hoverPeak]);

  const reset = useCallback(() => setPanel({ kind: 'default' }), []);
  const selectSection = useCallback((section: PortfolioSection) => {
    setPanel(section === 'overview' ? { kind: 'default' } : { kind: section });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof Element && e.target.closest('dialog'))) reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset]);

  // Ignore "clicks" that were really orbit drags.
  const onMiss = useCallback((e: MouseEvent) => {
    const d = downAt.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    reset();
  }, [reset]);

  // Hover previews a repo over the default or a pinned repo; peak panels stay put.
  const preview = hoverRepo && (panel.kind === 'default' || panel.kind === 'repo') ? hoverRepo : null;
  const shown: PanelState = preview ? { kind: 'repo', repo: preview } : panel;

  return (
    <div className="cc-root" onPointerDownCapture={(e) => { downAt.current = { x: e.clientX, y: e.clientY }; }}>
      {/* <div className="cc-honeycomb" aria-hidden="true" /> */}
      <div className="cc-canvas">
        {data && (
          <CityScene
            repos={data.repos}
            pinnedId={panel.kind === 'repo' ? panel.repo.id : null}
            hoverRepo={hoverRepo}
            hoverPeak={hoverPeak}
            onHoverRepo={setHoverRepo}
            onSelectRepo={(repo) => setPanel({ kind: 'repo', repo })}
            onHoverPeak={setHoverPeak}
            onSelectPeak={(key) => setPanel({ kind: key })}
            onMiss={onMiss}
          />
        )}
      </div>
      {data && (
        <Panel
          state={shown}
          portfolio={data.portfolio}
          repos={data.repos}
          github={data.github}
          onSelectSection={selectSection}
        />
      )}
      {!data && (
        <aside className="cc-panel" role="status">
          <div className="cc-scroll">
            <h1 className="cc-title">{error ? 'The city could not load' : 'Surveying the land'}</h1>
            <p className="cc-body">{error ?? 'Loading the portfolio.'}</p>
          </div>
        </aside>
      )}
    </div>
  );
}
