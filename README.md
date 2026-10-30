# Arsenie portfolio

An Astro + React + TypeScript portfolio. A hexagon profile picture is the root of a node tree. After 3 seconds it grows Projects, Skills and Experience nodes on random sides.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # type-checks, then builds to dist/
```

## Make it yours

All content is sample content. Edit these files:

| What | File |
| --- | --- |
| Name, specialisation, graduation line, GitHub and LinkedIn links | `src/data/site.ts` |
| Profile picture | put it in `public/` and set `avatar` in `src/data/site.ts` |
| Projects (set `live: true` and `url` to show "See Project") | `src/data/projects.ts` |
| Tech and soft skills | `src/data/skills.ts` |
| Experience timeline (each entry gets `/experience/<id>/`) | `src/data/experience.ts` |
| 2023, 2024 and 2025 courses with their portfolio projects | `src/data/courses.ts` |
| Colours and sizes | `src/styles/global.css` |

## How the tree behaves

- Hover a node to see its children for as long as the pointer stays on it.
- Click a node to pin it open. Click it again to collapse everything below it.
- Opening a node closes whatever other branch was open.
- Projects, Skills, Experience and the 2023, 2024 and 2025 capsules open a panel. The tree moves to one third of the screen and the panel takes the other two thirds.
- "Collapse all" (or clicking the root) goes back to the root node alone. There is no expand-all.
- `/?open=experience` opens a node straight away, which is what the full-page back link uses.

The Projects hover card loads live details from the GitHub API using `site.github.user`, and falls back to `githubFallback` if that fails.
