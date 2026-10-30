import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePortfolio } from '@/data/portfolio-context';

const SOFT_DELAY_MS = 3000;

export default function SkillsPanel() {
  const { data } = usePortfolio();
  const techSkills = data?.techSkills ?? [];
  const softSkills = data?.softSkills ?? [];
  const [showSoft, setShowSoft] = useState(false);
  const softRef = useRef<HTMLElement | null>(null);

  // Soft skills fade in below the tech skills after a delay.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSoft(true), SOFT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Then the window glides down so the whole panel is in view.
  useEffect(() => {
    if (!showSoft) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = window.requestAnimationFrame(() => {
      softRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showSoft]);

  return (
    <div className="skills">
      <section className="island" aria-labelledby="tech-title">
        <header className="island-head">
          <h2 id="tech-title">Tech skills</h2>
        </header>
        <div className="bento">
          {techSkills.map((group) => (
            <div key={group.id} className="group" style={{ '--tone': group.color } as CSSProperties}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item} className="badge">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {showSoft && (
        <section ref={softRef} className="island island--soft" aria-labelledby="soft-title">
          <header className="island-head">
            <h2 id="soft-title">Soft skills</h2>
          </header>
          <ul className="soft-grid">
            {softSkills.map((skill) => (
                <li key={skill.id}>
                <h3>{skill.title}</h3>
                <p>{skill.blurb}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {techSkills.length === 0 && softSkills.length === 0 && (
        <p className="filter-empty">No skills have been added yet. Sign in to add skills.</p>
      )}
    </div>
  );
}
