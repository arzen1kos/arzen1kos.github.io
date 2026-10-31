# ARZENIKOS.io

Astro + React + Three.js portfolio with Django Admin CRUD backed by one shared
SQLite database. The repository includes the schema only; portfolio data and
GitHub credentials stay local.

## Requirements

- Python 3.10 or newer
- Node.js 22.5 or newer

## Set up after cloning

```text
    cp .env.example .env
```

Add one server-side token per GitHub account to `.env`, for example
`GITHUB_TOKEN_PERSONAL=...` and `GITHUB_TOKEN_WORK=...`. Tokens are read only
by the Astro server and are never sent to the browser. The city displays
repositories the configured tokens can access, including private repository
metadata; use tokens scoped only to accounts and repositories you intend to
show.

The shared SQLite database path defaults to `backend/db/portfolio.db`.
`backend/db/schema.sql` defines the portfolio content tables. The local
database is ignored by Git and is never replaced by setup.

### Creating a virtual environment

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

Then install dependencies and initialize the shared database:

```sh
python -m pip install -r backend/requirements.txt
npm install
npm run db:setup
python backend/manage.py migrate
npm run build
```

Create a Django administrator account:

```sh
python backend/manage.py createsuperuser
```

Start Django:

```sh
python backend/manage.py runserver
```

Open [http://localhost:4321/city](http://localhost:4321/city) for the city and
[http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) for Django Admin.
The lock icon beside your name links to the admin editor for profile,
experience, projects, courses, and skills.

### Frontend development

Keep Django running, then start Astro in a second terminal:

```sh
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). The `/api/city` Astro
server endpoint reads the shared database and loads GitHub repositories with
the configured tokens. Django Admin uses that same SQLite file.

To re-establish the database schema on a fresh clone, run `npm run db:setup`.
It creates any missing tables without adding placeholder content. Then run
`python backend/manage.py migrate` to create Django's authentication/admin
tables in the same file. Do not delete the database to reset the schema if it
contains content; back it up and migrate the schema deliberately.

## Data and schema

- Shared SQLite file: `backend/db/portfolio.db`.
- Content schema: `backend/db/schema.sql`.
- Courses can be grouped by year and linked to project records in Django Admin.
- Django models and admin: `backend/portfolio/` (models map to the SQL-owned tables).
- Public read-only data endpoint: `/api/portfolio/`.
- Server-side city endpoint: `/api/city`.
- Authentication status endpoint: `/api/session/`.
- Authenticated CRUD: `/admin/` (Django session authentication and CSRF protection).

The schema SQL is the source of truth for portfolio-content tables. After
changing it, back up the database, update `schema.sql`, and run the applicable
forward-only migration/setup step. Django's migrations create its auth and
admin tables in the same SQLite file:

```sh
python backend/manage.py migrate
```

The same `PORTFOLIO_DB_PATH` variable is read by Django and Astro. Its default
is `./backend/db/portfolio.db`; `.env` values are loaded by both server
processes.

Projects can be linked to a GitHub repository by setting `repo_full_name` to
`owner/repo`. Their database `display_name`, `description`, and `languages`
customize the Projects panel without changing the repository name or tower.
The panel provides language filters and links to the matching repository.

The city uses a tilted bird's-eye camera and slow rotation. Towers are
hexagonal and positioned along the mountain foot; the three floating peak
hexagons open Skills, Experience, and Projects panels. Archived repositories
are dimmed and private repositories are faded. Hovering a tower previews its
details; clicking it pins that repository in the upper-left panel. Click empty
space or press Escape to return to the default panel. Panels slowly scroll
when their content overflows; scrolling pauses while you interact with them.

## Frontend module imports

Use the `@/*` alias for source imports, mapped to `src/*` in `tsconfig.json` and
Astro's Vite configuration:

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
