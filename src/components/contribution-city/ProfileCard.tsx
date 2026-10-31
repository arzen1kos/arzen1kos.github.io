import { useState } from 'react';
import type { TechCategory, TechItem } from '@/components/contribution-city/types';

interface Profile {
  name: string;
  username: string;
  githubUrl: string;
  avatarUrl: string;
  headline: string;
  linkedinUrl: string;
  graduationDate: string;
  graduationSchool: string;
}

function TechIcon({ item }: { item: TechItem }) {
  const [failed, setFailed] = useState(false);
  if (!item.iconUrl || failed) {
    return <span className="cc-icon-fallback" aria-hidden="true">{item.name.slice(0, 1).toUpperCase()}</span>;
  }
  return <img className="cc-tech-icon" src={item.iconUrl} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export function ProfileCard({
  profile,
  categories,
  totals,
}: {
  profile: Profile;
  categories: TechCategory[];
  totals: { repos: number; commits: number; accounts: number };
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const avatar = (
    <span className="cc-hex cc-hex-link" aria-hidden="true">
      <span className="cc-hex-inner">
        {profile.avatarUrl
          ? <img src={profile.avatarUrl} alt="" />
          : <span className="cc-hex-initials">{initials || '?'}</span>}
      </span>
    </span>
  );

  return (
    <section className="cc-panel cc-profile" aria-label="Profile and technologies">
      {profile.githubUrl ? (
        <a
          className="cc-profile-link"
          href={profile.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${profile.name || profile.username || 'profile'} GitHub profile in a new tab`}
        >
          {avatar}
        </a>
      ) : avatar}

      <div className="cc-who">
        {profile.name && <div className="cc-name">{profile.name}</div>}
        {profile.headline && <div className="cc-headline">{profile.headline}</div>}
        {profile.username && (
          <a className="cc-handle" href={profile.githubUrl} target="_blank" rel="noopener noreferrer">
            @{profile.username}
          </a>
        )}
        {(profile.graduationDate || profile.graduationSchool) && (
          <div className="cc-meta">
            {[profile.graduationDate, profile.graduationSchool].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      <div className="cc-stats">
        <div><div className="cc-stat-num">{totals.repos}</div><div className="cc-stat-label">repositories</div></div>
        <div><div className="cc-stat-num">{totals.commits}</div><div className="cc-stat-label">commits</div></div>
      </div>

      <div className="cc-capsules" aria-label="Technology categories">
        {categories.map((category) => {
          const expanded = openCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className={`cc-capsule${expanded ? ' is-open' : ''}`}
              aria-expanded={expanded}
              onClick={() => setOpenCategory(expanded ? null : category.id)}
            >
              {category.name}
              <span className="cc-count">{category.items.length}</span>
            </button>
          );
        })}
      </div>

      {categories.map((category) => (
        openCategory === category.id && (
          <div className="cc-techpanel" key={category.id} aria-label={`${category.name} technologies`}>
            {category.items.length === 0 ? (
              <p className="cc-empty">No technologies in this category yet.</p>
            ) : (
              <ul className="cc-techlist">
                {category.items.map((item) => (
                  <li key={item.id}>
                    <TechIcon item={item} />
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      ))}
    </section>
  );
}
