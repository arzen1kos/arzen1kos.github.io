import type { CityRepo } from '@/components/contribution-city/types';

const full = new Intl.NumberFormat('en');

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Details of the skyscraper under the cursor, shown below the profile card. */
export function InfoPanel({ repo }: { repo: CityRepo }) {
  const pushed = formatDate(repo.pushedAt);
  const langs = repo.languages.slice(0, 5);

  return (
    <div className="cc-panel cc-repo-detail">
      <div className="cc-eyebrow">@{repo.account}</div>
      <div className="cc-repo-name">{repo.name}</div>

      <div className="cc-badges">
        {repo.isPrivate && <span className="cc-badge">Private</span>}
        {repo.isArchived && <span className="cc-badge">Archived</span>}
        {repo.isFork && <span className="cc-badge">Fork</span>}
      </div>

      {repo.description && <p className="cc-desc">{repo.description}</p>}

      {langs.length > 0 && (
        <>
          <div className="cc-langbar" aria-hidden="true">
            {langs.map((l) => (
              <span key={l.name} style={{ width: `${l.percent}%`, background: l.color }} />
            ))}
          </div>
          <ul className="cc-langs">
            {langs.map((l) => (
              <li key={l.name}>
                <span className="cc-dot" style={{ background: l.color }} />
                {l.name} <em>{l.percent}%</em>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="cc-stats">
        <div>
          <div className="cc-stat-num">{full.format(repo.commits)}</div>
          <div className="cc-stat-label">commits</div>
        </div>
        {pushed && (
          <div>
            <div className="cc-stat-num cc-stat-small">{pushed}</div>
            <div className="cc-stat-label">last push</div>
          </div>
        )}
      </div>

      {repo.url && <div className="cc-hint">Click to open on GitHub</div>}
    </div>
  );
}