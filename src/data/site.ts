export const site = {
  name: 'NAME',
  /** Your dev profile picture. Drop the file in /public and update this path (e.g. "/profile.jpg"). */
  avatar: '/profile.svg',
  specialisation: [],
  graduation: {
    date: 'Date',
    school: 'School',
  },
  github: {
    user: 'your-github-username',
    url: 'https://github.com/your-github-username',
  },
  linkedin: 'https://www.linkedin.com/in/your-linkedin-handle',
  /** Shown on the GitHub hover card if the live GitHub lookup fails. */
  githubFallback: {
    name: '',
    bio: '',
    repos: 12,
    followers: 0,
    following: 0,
  },
} as const;
