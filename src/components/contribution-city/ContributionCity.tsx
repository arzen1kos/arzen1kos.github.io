import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { CityData, CityIsland } from '@/components/contribution-city/portfolio-types';
import type { CityRepo, ExperienceEntry, ExperienceMountain } from '@/components/contribution-city/types';
import { AdminAccess } from '@/components/contribution-city/AdminAccess';
import { CameraRig, type FocusTarget } from '@/components/contribution-city/CameraRig';
import { CollectionPanel, collectionFor } from '@/components/contribution-city/CollectionPanel';
import { ExperienceFull, ExperiencePanel } from '@/components/contribution-city/ExperiencePanel';
import { InfoPanel } from '@/components/contribution-city/InfoPanel';
import { Islands } from '@/components/contribution-city/Islands';
import { Mountains } from '@/components/contribution-city/Mountains';
import { ProfileCard } from '@/components/contribution-city/ProfileCard';
import { buildCity, CELL, islandRadius } from '@/components/contribution-city/layout';
import { Tower } from '@/components/contribution-city/Tower';
import { WORLD } from '@/components/contribution-city/world.config';
import '@/components/contribution-city/ContributionCity.css';

const ACCOUNT_PALETTE = ['#2dd4bf', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];
const FALLBACK_LANG = '#8b949e';
const HOME_TARGET: [number, number, number] = [0, 1, 0];

export interface ContributionCityProps {
  repos: CityRepo[];
  height?: number | string;
  colorBy?: 'account' | 'language';
  openInNewTab?: boolean;
  rotateSpeed?: number;
  className?: string;
}

type Panel = { type: 'experience' } | { type: 'island'; slug: string } | null;

export default function ContributionCity({
  repos,
  height = '88vh',
  colorBy = 'account',
  openInNewTab = true,
  rotateSpeed = 0.28,
  className,
}: ContributionCityProps) {
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/city/', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`City API returned HTTP ${response.status}.`);
        return (await response.json()) as CityData;
      })
      .then(setCityData)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : 'Unable to load city data.';
        setError(message);
        console.error('Could not load the contribution city from Django.', reason);
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return <p className="cc-loading cc-loading-error" role="alert">Could not load the city: {error}</p>;
  }
  if (!cityData) {
    return <p className="cc-loading" role="status">Loading your city…</p>;
  }

  return (
    <LoadedCity
      repos={repos}
      cityData={cityData}
      height={height}
      colorBy={colorBy}
      openInNewTab={openInNewTab}
      rotateSpeed={rotateSpeed}
      className={className}
    />
  );
}

function LoadedCity({
  repos,
  cityData,
  height,
  colorBy,
  openInNewTab,
  rotateSpeed,
  className,
}: Required<Pick<ContributionCityProps, 'height' | 'colorBy' | 'openInNewTab' | 'rotateSpeed'>> &
  Pick<ContributionCityProps, 'className'> & {
    repos: CityRepo[];
    cityData: CityData;
  }) {
  const { portfolio, terrain } = cityData;
  const city = useMemo(() => buildCity(repos), [repos]);
  const accounts = useMemo(() => [...new Set(repos.map((repo) => repo.account))], [repos]);
  const profile = useMemo(() => {
    const username = portfolio.profile.username || accounts[0] || '';
    return {
      ...portfolio.profile,
      username,
      githubUrl:
        portfolio.profile.githubUrl ||
        (username ? `https://github.com/${encodeURIComponent(username)}` : ''),
    };
  }, [accounts, portfolio.profile]);
  const accountColor = useMemo(
    () => new Map(accounts.map((account, index) => [account, ACCOUNT_PALETTE[index % ACCOUNT_PALETTE.length] ?? '#2dd4bf'])),
    [accounts],
  );
  const totals = useMemo(
    () => ({ repos: repos.length, commits: repos.reduce((sum, repo) => sum + repo.commits, 0), accounts: accounts.length }),
    [repos, accounts],
  );
  const experience = useMemo(
    () => [...portfolio.experiences].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [portfolio.experiences],
  );

  const islandReach = portfolio.islands.reduce(
    (max, island) =>
      Math.max(max, Math.hypot(island.position[0], island.position[2]) + islandRadius(island.rings) * island.scale),
    0,
  );
  const mountainReach = portfolio.experienceMountains.reduce(
    (max, mountain) => Math.max(max, (mountain.distance ?? 0) + (mountain.radius ?? 0)),
    Number(WORLD.mountains.innerRadius),
  );
  const innerRadius = Math.max(
    city.radius + WORLD.mountains.clearance,
    islandReach + WORLD.mountains.clearance,
    mountainReach,
  );
  const homeDistance = Math.max(WORLD.camera.homeDistance, innerRadius * 2.45);

  const [hoveredRepo, setHoveredRepo] = useState<CityRepo | null>(null);
  const [hoverMessage, setHoverMessage] = useState<string | null>(null);
  const [hoverIsland, setHoverIsland] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedExp, setSelectedExp] = useState<number | null>(experience[0]?.id ?? null);
  const [selectedMountainId, setSelectedMountainId] = useState<string | null>(
    portfolio.experienceMountains[0]?.id ?? null,
  );
  const [expandedExp, setExpandedExp] = useState<number | null>(null);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const flyTo = useCallback((target: [number, number, number], distance: number) => {
    setFocus({ target, distance });
  }, []);
  const goHome = useCallback(() => flyTo(HOME_TARGET, homeDistance), [flyTo, homeDistance]);
  const closePanel = useCallback(() => {
    setPanel(null);
    setExpandedExp(null);
    goHome();
  }, [goHome]);

  const openRepo = useCallback(
    (repo: CityRepo) => {
      if (!repo.url) return;
      if (openInNewTab) window.open(repo.url, '_blank', 'noopener,noreferrer');
      else window.location.href = repo.url;
    },
    [openInNewTab],
  );

  const selectFlag = useCallback(
    (entry: ExperienceEntry, position: [number, number, number]) => {
      setPanel({ type: 'experience' });
      setSelectedExp(entry.id);
      setSelectedMountainId(
        entry.mountainId === null || entry.mountainId === undefined
          ? null
          : String(entry.mountainId),
      );
      setExpandedExp(null);
      flyTo(position, 16);
    },
    [flyTo],
  );
  const openMountain = useCallback(
    (mountain: ExperienceMountain, position: [number, number, number]) => {
      setPanel({ type: 'experience' });
      setSelectedMountainId(mountain.id);
      setSelectedExp((current) =>
        mountain.entries.some((entry) => entry.id === current)
          ? current
          : mountain.entries[0]?.id ?? null,
      );
      flyTo(position, 24);
    },
    [flyTo],
  );
  const selectIsland = useCallback(
    (island: CityIsland) => {
      if (island.kind === 'experience') {
        const mountain = portfolio.experienceMountains[0];
        setPanel({ type: 'experience' });
        setSelectedMountainId(mountain?.id ?? null);
        setSelectedExp((current) =>
          mountain?.entries.some((entry) => entry.id === current)
            ? current
            : mountain?.entries[0]?.id ?? experience[0]?.id ?? null,
        );
      } else {
        setPanel({ type: 'island', slug: island.slug });
      }
      flyTo([island.position[0], island.position[1] + 1, island.position[2]], 15);
    },
    [experience, flyTo, portfolio.experienceMountains],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (expandedExp !== null) setExpandedExp(null);
        else if (panel) closePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel, expandedExp, panel]);

  const colorFor = (repo: CityRepo) =>
    colorBy === 'language'
      ? repo.languages[0]?.color ?? FALLBACK_LANG
      : accountColor.get(repo.account) ?? '#2dd4bf';
  const activeIsland =
    panel?.type === 'island' ? portfolio.islands.find((island) => island.slug === panel.slug) : undefined;
  const selectedMountain =
    portfolio.experienceMountains.find((mountain) => mountain.id === selectedMountainId) ?? null;
  const expandedExperience = experience.find((entry) => entry.id === expandedExp);
  const paused = !!hoveredRepo || !!hoverMessage || !!hoverIsland || !!panel;
  const pointer = !!hoverMessage || !!hoverIsland || !!hoveredRepo?.url;
  const elevation = (WORLD.camera.elevationDeg * Math.PI) / 180;
  const cameraPosition: [number, number, number] = [
    0,
    HOME_TARGET[1] + homeDistance * Math.sin(elevation),
    homeDistance * Math.cos(elevation),
  ];

  return (
    <section
      className={`cc-root${className ? ` ${className}` : ''}`}
      style={{ height, cursor: pointer ? 'pointer' : 'default' }}
      aria-label={`Contribution city with ${totals.repos} repositories`}
    >
      <AdminAccess />
      <div className="cc-canvas">
        <Canvas camera={{ position: cameraPosition, fov: WORLD.camera.fov, near: 0.1, far: 300 }} dpr={[1, 1.5]}>
          <fog attach="fog" args={[WORLD.fog.color, WORLD.fog.near, WORLD.fog.far]} />
          <ambientLight intensity={0.65} />
          <hemisphereLight args={['#99f6e4', '#0a2c29', 0.38]} />
          <directionalLight position={[10, 18, 8]} intensity={1.5} />
          <directionalLight position={[-10, 8, -8]} intensity={0.5} color="#5eead4" />

          {city.cells.map((cell) => (
            <mesh key={`${cell.q},${cell.r}`} position={[cell.x, -0.05, cell.z]}>
              <cylinderGeometry args={[CELL * 0.97, CELL * 0.97, 0.1, 6]} />
              <meshStandardMaterial color="#0c3b37" flatShading roughness={0.9} />
            </mesh>
          ))}
          {city.buildings.map((building) => (
            <Tower
              key={building.repo.id}
              building={building}
              color={colorFor(building.repo)}
              active={hoveredRepo?.id === building.repo.id}
              onOver={setHoveredRepo}
              onOut={(repo) => setHoveredRepo((current) => (current?.id === repo.id ? null : current))}
              onOpen={openRepo}
            />
          ))}
          <Islands
            islands={portfolio.islands}
            hoveredSlug={hoverIsland}
            reducedMotion={reducedMotion}
            onHover={setHoverIsland}
            onSelect={selectIsland}
          />
          <Mountains
            mountains={portfolio.experienceMountains}
            terrain={terrain}
            selectedId={panel?.type === 'experience' ? selectedExp : null}
            onSelectFlag={selectFlag}
            onOpenMountain={openMountain}
            onHover={(key, message) => {
              setHoverMessage(key ? message ?? key : null);
            }}
          />
          <OrbitControls
            makeDefault
            target={HOME_TARGET}
            enablePan={false}
            enableDamping
            autoRotate={!paused && !reducedMotion}
            autoRotateSpeed={rotateSpeed}
            minDistance={WORLD.camera.minDistance}
            maxDistance={WORLD.camera.maxDistance}
            maxPolarAngle={Math.PI * 0.49}
          />
          <CameraRig focus={focus} />
        </Canvas>
      </div>

      <div className="cc-left">
        <ProfileCard profile={profile} categories={portfolio.categories} totals={totals} />
        {hoveredRepo && <InfoPanel repo={hoveredRepo} />}
      </div>

      {panel && (
        <aside className="cc-drawer">
          {panel.type === 'experience' && (
            <ExperiencePanel
              mountain={selectedMountain}
              experiences={selectedMountain?.entries ?? experience}
              selectedId={selectedExp}
              onSelect={setSelectedExp}
              onExpand={setExpandedExp}
              onClose={closePanel}
            />
          )}
          {panel.type === 'island' && activeIsland && (
            <CollectionPanel
              island={activeIsland}
              items={collectionFor(activeIsland, portfolio)}
              onClose={closePanel}
            />
          )}
        </aside>
      )}

      {expandedExperience && (
        <ExperienceFull experience={expandedExperience} onBack={() => setExpandedExp(null)} />
      )}

      {terrain.warning && <p className="cc-terrain-note" role="status">{terrain.warning}</p>}
      {hoverMessage && <p className="cc-tip">{hoverMessage} · click to explore</p>}
      <div className="cc-actions">
        <button type="button" className="cc-btn cc-btn-ghost" onClick={goHome}>Reset view</button>
      </div>
      {colorBy === 'account' && accounts.length > 1 && (
        <div className="cc-legend">
          {accounts.map((account) => (
            <span key={account}>
              <i className="cc-dot" style={{ background: accountColor.get(account) }} />@{account}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
