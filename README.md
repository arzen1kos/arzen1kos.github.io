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
server endpoint reads portfolio data from Django's `/api/portfolio/` endpoint
and loads GitHub repositories with the configured server-side tokens. Django
Admin and the portfolio API use the same SQLite file.

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

Netlify builds the Astro frontend using `netlify.toml` and the Netlify adapter.
The Django backend must be deployed separately with the portfolio database and
serve `/api/portfolio/` and `/admin/`. SQLite data in this repository is
gitignored and is not included in the Netlify build.

Set these variables in the Netlify site environment settings:

- `DJANGO_API_URL`: public base URL of the Django service, without a trailing
  slash (for example, `https://your-service.onrender.com`).
- `PUBLIC_DJANGO_ADMIN_URL`: that service's `/admin/` URL.
- `GITHUB_TOKEN_*` variables, or `GITHUB_TOKENS` as a comma-separated list.
  These are read only by the server function; never add token values to
  `netlify.toml` or client-prefixed environment variables.

For local development, `.env` is loaded by the server and Django. Copy the
variable names from `.env.example`, keep the database path pointing at your
local database, and start Django before testing the Astro site. Netlify does
not receive the ignored `.env` file, so configure its variables in the Netlify
dashboard before publishing. The Django service also needs its own production
`DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS`, and persistent
database configuration.
