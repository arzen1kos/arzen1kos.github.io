import type { ExperienceItem, Portfolio, ProjectItem, Repo } from '@/components/contribution-city/types';
import { DJANGO_API_URL } from '@/lib/server-config';

interface DjangoPortfolioResponse {
  site: {
    name: string;
    headline?: string;
    bio?: string;
  };
  experience: Array<{
    id: number;
    role: string;
    org: string;
    location: string;
    startDate: string;
    endDate: string | null;
    summary: string;
    details: string[];
  }>;
  techSkills: Array<{
    id: number;
    title: string;
    color: string;
    items: string[];
  }>;
  softSkills: Array<{ title: string; blurb: string }>;
  projects: Array<{
    id: number;
    repo: string | null;
    name: string;
    description: string;
    languages: string[];
    color: string;
  }>;
}

async function fetchPortfolioData(): Promise<DjangoPortfolioResponse> {
  const response = await fetch(`${DJANGO_API_URL}/api/portfolio/`);
  if (!response.ok) {
    throw new Error(`Django portfolio API returned HTTP ${response.status}.`);
  }
  return (await response.json()) as DjangoPortfolioResponse;
}

function toExperience(item: DjangoPortfolioResponse['experience'][number]): ExperienceItem {
  return {
    id: item.id,
    title: item.role,
    organisation: item.org,
    location: item.location,
    startDate: item.startDate,
    endDate: item.endDate,
    summary: item.summary,
    details: item.details,
  };
}

export async function getExperience(id: number): Promise<ExperienceItem | null> {
  const data = await fetchPortfolioData();
  const item = data.experience.find((entry) => entry.id === id);
  return item ? toExperience(item) : null;
}

export async function getPortfolio(repos: Repo[]): Promise<Portfolio> {
  const data = await fetchPortfolioData();
  const reposByName = new Map(repos.map((repo) => [repo.fullName.toLowerCase(), repo]));
  const projects: ProjectItem[] = data.projects.map((project) => {
    const repo = project.repo ? reposByName.get(project.repo.toLowerCase()) : undefined;
    return {
      id: project.id,
      repoFullName: project.repo,
      displayName: project.name,
      description: project.description || repo?.description || '',
      languages: project.languages.length
        ? project.languages
        : repo?.languages.slice(0, 3).map((language) => language.name) ?? [],
      color: project.color,
      url: repo?.url ?? null,
    };
  });

  return {
    profile: {
      name: data.site.name,
      headline: data.site.headline ?? '',
      bio: data.site.bio ?? '',
    },
    experience: data.experience.map(toExperience),
    skillCategories: data.techSkills.map((category) => ({
      id: category.id,
      name: category.title,
      color: category.color,
      skills: category.items,
    })),
    softSkills: data.softSkills.map((skill) => ({
      name: skill.title,
      description: skill.blurb,
    })),
    projects,
  };
}
