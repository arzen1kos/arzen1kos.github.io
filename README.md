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
and are never uploaded to GitHub Pages. During the Actions build, GitHub data
is fetched with a scoped personal access token. Only public, non-fork
repository data is included in the deployed site; the PAT and private
repository metadata are never published.

## GitHub Pages deployment

The workflow in [`.github/workflows/deploy.yaml`](./.github/workflows/deploy.yaml)
builds and deploys when changes are pushed to the `github-pages` branch, and
can also be run manually from the Actions tab. It:

1. Installs the locked npm dependencies.
2. Uses one or more PATs to fetch each authenticated account's public profile
   statistics, contribution calendar, and public non-fork repositories.
3. Builds the static Astro site and deploys the `dist` output.

### Connect GitHub accounts

Create one token for each account whose contribution activity and repositories
you want to include:

1. Sign in as that GitHub account and open
   [Personal access tokens → Tokens (classic)](https://github.com/settings/tokens).
2. Select **Generate new token (classic)**, add a descriptive note such as
   `Portfolio GitHub Pages`, and choose an expiration.
3. Select only **`read:user`** and **`public_repo`**. Do not select **`repo`**:
   this site exports public, non-fork repositories only. The classic-token
   `public_repo` scope also permits writes to public repositories, so keep the
   token private, use an expiration, and revoke it when no longer needed.
4. Generate the token and copy it immediately. GitHub will not show it again.
5. For deployment, open this repository's **Settings → Secrets and variables
   → Actions → New repository secret**. Name it `GITHUB_TOKENS` and paste
   tokens separated by commas, with one token for each account.
6. For local exports, put the tokens in `.env` as either
   `GITHUB_TOKENS=token1,token2` or separate variables such as
   `GITHUB_TOKEN_PERSONAL=token1` and `GITHUB_TOKEN_WORK=token2`. Never commit
   `.env` or paste tokens into source files.
7. Run **Actions → Deploy to GitHub Pages → Run workflow**, or push to the
   `github-pages` branch.

The previous single-token Actions secret `GH_PAT` remains supported as a
fallback. The build queries GitHub's GraphQL API for each authenticated
account's contribution calendar and repository commit totals, then writes
public-only data to `github.json` and `repos.json`. Tokens are used only during
the build and are not included in the static site. Private repositories are
filtered out before either JSON file is written. Contributions from accounts
are combined by date in the displayed calendar.

The repository is `arzen1kos.github.io`, so Astro uses the root path
(`https://arzen1kos.github.io/`). In the GitHub repository, open
**Settings → Pages** and set the deployment source to **GitHub Actions**.

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
