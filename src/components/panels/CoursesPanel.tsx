import { usePortfolio } from '@/data/portfolio-context';
import type { CourseYear } from '@/types/portfolio';
import ProjectCard from '@/components/ProjectCard';

export default function CoursesPanel({ year }: { year: CourseYear }) {
  const { data } = usePortfolio();
  const list = data?.courses[year] ?? [];
  const yearLabel = year.replace('y', 'Year ');

  return (
    <section className="panel" aria-labelledby="courses-title">
      <header className="panel-head">
        <h2 id="courses-title">{yearLabel} courses</h2>
        <p>{data?.site.graduation.school}</p>
      </header>
      <div className="course-grid">
        {list.map((course) => (
          <article key={course.code} className="course">
            <p className="course-code">{course.code}</p>
            <h3>{course.name}</h3>
            <p className="course-desc">{course.description}</p>
            {course.tags.length > 0 && (
              <ul className="shields" aria-label="Course tags">
                {course.tags.map((tag) => <li key={tag} className="shield">{tag}</li>)}
              </ul>
            )}
            {course.projects.length > 0 && (
              <div className="course-project">
                <p className="course-project-label">Portfolio project</p>
                {course.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} compact />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      {list.length === 0 && (
        <p className="filter-empty">No courses have been added for {yearLabel}. Sign in to add courses.</p>
      )}
    </section>
  );
}
