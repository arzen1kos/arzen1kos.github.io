import type { CourseYear } from '@/types/portfolio';
import type { ExperienceEntry, ExperienceMountain, TechCategory } from '@/components/contribution-city/types';

export interface CityIsland {
  id: number;
  slug: string;
  name: string;
  kind: 'projects' | 'courses' | 'experience';
  subtitle: string;
  position: [number, number, number];
  rings: number;
  scale: number;
  rotationSpeed: number;
  color: string;
}

export interface PortfolioData {
  profile: {
    name: string;
    username: string;
    githubUrl: string;
    avatarUrl: string;
    headline: string;
    linkedinUrl: string;
    graduationDate: string;
    graduationSchool: string;
  };
  categories: TechCategory[];
  islands: CityIsland[];
  experiences: ExperienceEntry[];
  experienceMountains: ExperienceMountain[];
  projects: Array<{
    id: number;
    name: string;
    description: string;
    fullPageContent: string;
    logo: string;
    languages: string[];
    tags: string[];
    images: Array<{ url: string; alt: string }>;
    repo: string;
    live: boolean;
    url: string;
    githubAvailable: boolean;
  }>;
  courses: Record<CourseYear, Array<{
    code: string;
    name: string;
    description: string;
    tags: string[];
    projects: PortfolioData['projects'];
  }>>;
}

export interface TerrainData {
  center: [number, number];
  radiusKm: number;
  samplesPerSide: number;
  elevations: number[];
  source: 'google-elevation' | 'procedural';
  warning: string | null;
}

export interface CityData {
  portfolio: PortfolioData;
  terrain: TerrainData;
}
