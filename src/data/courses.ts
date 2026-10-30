import type { Course, Year } from './types';

export const years: Year[] = ['2023', '2024', '2025'];

export const courses: Record<Year, Course[]> = {
  '2023': [
    {
      code: 'CODE',
      name: 'Course Name',
      description: 'Course',
      project: {
        id: 'ID',
        name: 'Name',
        description: 'Description',
        languages: ['Languages'],
        repo: '',
        live: false,
      },
    },
  ],
  '2024': [
    {
      code: 'CODE',
      name: 'Course Name',
      description: 'Course',
      project: {
        id: 'ID',
        name: 'Name',
        description: 'Description',
        languages: ['Languages'],
        repo: '',
        live: false,
      },
    },
  ],
  '2025': [
    {
      code: 'CODE',
      name: 'Course Name',
      description: 'Course',
      project: {
        id: 'ID',
        name: 'Name',
        description: 'Description',
        languages: ['Languages'],
        repo: '',
        live: false,
      },
    },
  ],
};
