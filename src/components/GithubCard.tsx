import { useEffect, useState } from 'react';
import { site } from '../data/site';
import { withBase } from '../lib/url';
import { GithubIcon } from './icons';

interface GithubUser {
  name: string | null;
  login: string;
  bio: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
}

// One request per page load, shared by every hover.
let cached: Promise<GithubUser | null> | null = null;

function loadUser(): Promise<GithubUser | null> {
  if (!cached) {
    cached = fetch(`https://api.github.com/users/${site.github.user}`)
      .then((response) => (response.ok ? (response.json() as Promise<GithubUser>) : null))
      .catch(() => null);
  }
  return cached;
}

/** Shown below the root node while hovering the Projects node. */
export default function GithubCard() {
  const [user, setUser] = useState<GithubUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadUser().then((result) => {
      if (!cancelled) setUser(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fallback = site.githubFallback;
  const name = user?.name ?? fallback.name;
  const bio = user?.bio ?? fallback.bio;
  const avatar = user?.avatar_url ?? withBase(site.avatar);
  const stats = [
    { label: 'Repositories', value: user?.public_repos ?? fallback.repos },
    { label: 'Followers', value: user?.followers ?? fallback.followers },
    { label: 'Following', value: user?.following ?? fallback.following },
  ];

  return (
    <aside className="gh-card" aria-label="GitHub profile">
      <div className="gh-head">
        <span className="gh-avatar">
          <img src={avatar} alt="" />
        </span>
        <div>
          <p className="gh-name">{name}</p>
          <p className="gh-handle">
            <GithubIcon /> {user?.login ?? site.github.user}
          </p>
        </div>
      </div>
      <p className="gh-bio">{bio}</p>
      <dl className="gh-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
