import { courses } from '../../data/courses';
import type { Year } from '../../data/types';
import { site } from '../../data/site';
import ProjectCard from '../ProjectCard';

export default function CoursesPanel({ year }: { year: Year }) {
  const list = courses[year];

  return (
    <section className="panel" aria-labelledby="courses-title">
      <header className="panel-head">
        <h2 id="courses-title">{year} courses</h2>
        <p>{site.graduation.school}</p>
      </header>
      <div className="course-grid">
        {list.map((course) => (
          <article key={course.code} className="course">
            <p className="course-code">{course.code}</p>
            <h3>{course.name}</h3>
            <p className="course-desc">{course.description}</p>
            {course.project && (
              <div className="course-project">
                <p className="course-project-label">Portfolio project</p>
                <ProjectCard project={course.project} compact />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
