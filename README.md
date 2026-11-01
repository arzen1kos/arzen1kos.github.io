# ARZENIKOS.io

An Astro, React, and Three.js portfolio published as a static GitHub Pages
site. The contribution city, portfolio panels, and experience detail dialogs
run entirely in the browser; no server or runtime API is required.

## Local development

Requirements: Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. To build and preview the production site:

```sh
npm run build
npm run preview
```

## Portfolio content

The public profile, experience, skills, and curated projects are stored in
[`public/data/portfolio.json`](./public/data/portfolio.json). This file is
included in the published site, so only put information here that should be
public.

If you maintain portfolio content in the optional local Django/SQLite admin,
export its current database before publishing:

```sh
npm run data:export
```

Review and commit the updated JSON. The local database and `.env` are ignored
and are never uploaded to GitHub Pages. GitHub repository data is fetched
during the Actions build and includes public, non-fork repositories only.
Private tokens, private repository metadata, and Django Admin are not part of
the static site.

## GitHub Pages deployment

The workflow in [`.github/workflows/deploy.yaml`](./.github/workflows/deploy.yaml)
builds and deploys when changes are pushed to the `github-pages` branch, and
can also be run manually from the Actions tab. It:

1. Installs the locked npm dependencies.
2. Fetches public repositories for the repository owner.
3. Builds the static Astro site and deploys the `dist` output.

The repository is `arzen1kos.github.io`, so Astro uses the root path
(`https://arzen1kos.github.io/`). No personal GitHub token is required. In the
GitHub repository, open **Settings → Pages** and set the deployment source to
**GitHub Actions**.

Experience entries open in accessible in-page dialogs. There are no dynamic
experience URLs or server routes to configure.

## Optional Django content editor

The Django project and local SQLite admin are retained as an optional way to
edit portfolio data. They are not deployed to GitHub Pages. To set up the
local editor, create `.env` from `.env.example`, then run:

```sh
python -m pip install -r backend/requirements.txt
npm run db:setup
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver
```

The local admin is at `http://127.0.0.1:8000/admin/`. After editing, run
`npm run data:export`, review the generated public JSON, and commit it when
ready to publish.
