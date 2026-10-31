# Portfolio

Astro + React + TypeScript frontend with a Django backend and SQLite database.
Portfolio content is stored only in the local database; a fresh clone starts
with an empty portfolio.

## Requirements

- Python 3.10 or newer
- Node.js 22.5 or newer

## Set up after cloning

From the repository root, create and activate a Python environment, install
dependencies, and build the frontend:

```text
python -m venv .venv
```

Activate it in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```sh
source .venv/bin/activate
```

Then install and build:

```sh
python -m pip install -r backend/requirements.txt
npm install
npm run build
```

Create the SQLite database schema and an administrator account:

```sh
python backend/manage.py migrate
python backend/manage.py createsuperuser
```

Start Django:

```sh
python backend/manage.py runserver
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). **Sign in to edit** opens
Django Admin. After signing in, create or update the profile, projects, skill
categories and skills, experience entries, and courses there. Associate
projects with courses using the course editor. If you return to the portfolio,
the sign-in link changes to **Edit portfolio**.

### Frontend development

Keep Django running, then start Astro in a second terminal:

```sh
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). Astro proxies `/api`,
`/admin`, and `/static` to Django at `127.0.0.1:8000`.

The contribution city is available at [http://localhost:4321/city](http://localhost:4321/city).
Its portfolio data is loaded from Django/SQLite when the page opens. The scene
layout is also stored in SQLite: edit the islands, experience mountains, and
terrain in Django Admin. The initial schema migration creates the three island
positions and a Christchurch Port Hills terrain/mountain layout, but does not
insert portfolio content.

To use real GitHub repositories as city towers, set `GITHUB_TOKENS` in the
environment before building the frontend. It accepts comma-separated
server-side GitHub tokens; tokens are used during the build and are not sent to
the browser. Without a token, the city simply renders without repository towers.
For example, in PowerShell:

```powershell
$env:GITHUB_TOKENS = "your-token"
npm run build
```

Google Elevation data is optional. Enable the Google Maps Elevation API for
your project and set `GOOGLE_MAPS_API_KEY` in the Django process environment.
The key is only used server-side and cached elevation data is stored in
`CityTerrain`; without a key, the city displays its procedural Port Hills
terrain. In PowerShell, set the key before starting Django:

```powershell
$env:GOOGLE_MAPS_API_KEY = "your-key"
python backend/manage.py runserver
```

After cloning an existing database or applying schema changes, run
`python backend/manage.py migrate` to recreate or update the schema. To create
the city configuration and schema on a fresh checkout, the ordinary initial
setup above already runs the migrations; no SQLite file or actual portfolio
records are committed.

## Data and schema

- SQLite file: `backend/db.sqlite3` (ignored by Git; do not commit it).
- Django models and admin: `backend/portfolio/`.
- Versioned schema: `backend/portfolio/migrations/`.
- Public read-only data endpoint: `/api/portfolio/`.
- City content and scene settings endpoint: `/api/city/`.
- Authentication status endpoint: `/api/session/`.
- Authenticated CRUD for portfolio content and city layout: `/admin/` (Django
  session authentication and CSRF protection).

Migrations recreate the schema, not portfolio content. To apply migrations after
a schema update, run:

```sh
python backend/manage.py migrate
```

When changing models, generate and commit the new migration first:

```sh
python backend/manage.py makemigrations
python backend/manage.py migrate
```

The database path can be changed with `PORTFOLIO_DB_PATH`. Use an absolute path
for predictable local and hosted deployments. Back up the SQLite file
separately if you want to keep entered content; it is intentionally never
versioned.

Projects support a logo URL, GitHub/demo links and availability flags,
language/tag lists, full-page text, and image links. For project images, enter a
JSON list such as:

```json
[{"url": "https://example.com/image.jpg", "alt": "Project screenshot"}]
```

The frontend loads content from Django at runtime. Project cards open their
full-page project details; course cards include associated projects. The app
has no bundled portfolio records or frontend content data modules. The
`/city` experience trail, skill categories, projects, and courses all use the
same database records as the portfolio page. Experience records created in
Django Admin are placed on the first configured mountain by default; change
the mountain field when you add more trails.

## Frontend module imports

Use only the `@/*` alias for source imports, mapped to `src/*` in
`tsconfig.json` and Astro's Vite configuration:

```ts
import ProjectCard from '@/components/ProjectCard';
import type { Project } from '@/types/portfolio';
```

## Deployment

Build the frontend with `npm run build`, apply Django migrations, then run
`python backend/manage.py collectstatic --noinput`. Serve the same-origin
frontend and API through Django (or a reverse proxy). Django serves the
generated frontend and WhiteNoise serves collected assets. Configure
`DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, and `DJANGO_ALLOWED_HOSTS` in production.
SQLite requires persistent writable storage; static-only hosting such as
GitHub Pages cannot run this CRUD application.
