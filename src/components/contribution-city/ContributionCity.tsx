import { useCallback, useEffect, useRef, useState } from 'react';
import { CityScene } from './CityScene';
import { Panel } from './Panels';
import type { CityPayload, PanelState, PeakKey, Repo } from './types';
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
    fetch('/api/city', { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<CityPayload>) : Promise.reject(new Error(`Server returned ${r.status}`))))
      .then(setData)
      .catch((e: Error) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    document.body.style.cursor = hoverRepo || hoverPeak ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hoverRepo, hoverPeak]);

  const reset = useCallback(() => setPanel({ kind: 'default' }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') reset(); };
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
          tokenMissing={data.tokenMissing}
          onSelectPeak={(key) => setPanel({ kind: key })}
        />
      )}
      {!data && (
        <aside className="cc-panel" role="status">
          <div className="cc-scroll">
            <h1 className="cc-title">{error ? 'The city could not load' : 'Surveying the land'}</h1>
            <p className="cc-body">{error ?? 'Fetching repositories from GitHub.'}</p>
          </div>
        </aside>
      )}
    </div>
  );
}
