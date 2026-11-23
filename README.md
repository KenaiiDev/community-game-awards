# Community Game Awards

Open-source, community-run game awards. Judges are drawn at random from the community, every nomination is public, and every rule is published before an edition starts.

This repository currently ships the **landing page and judge signup** for the express edition: sign in with Discord, accept the public-identity terms, apply once per edition, withdraw while signup is open, and delete your data yourself (after a one-week grace period).

## Quick path

Requirements: Node.js 24, pnpm 10, and Podman or Docker (only for PostgreSQL).

```bash
pnpm install
podman compose up -d                        # or: docker compose up -d
```

Create `apps/api/.env` (see [Configuration](#configuration)), then:

```bash
pnpm --filter api db:migrate                # create the tables
EDITION_SLUG=express-2026 EDITION_NAME="Express 2026" \
SIGNUP_OPENS_AT=2026-11-22T00:00:00Z SIGNUP_CLOSES_AT=2026-12-15T00:00:00Z \
  pnpm --filter api edition:upsert          # create or update the edition
pnpm --filter api start:dev                 # API on http://localhost:4000
pnpm --filter web dev                       # web on http://localhost:3000
```

Open http://localhost:3000 (English) or http://localhost:3000/es (Spanish).

## Configuration

### API (`apps/api/.env`)

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://boligas:boligas@localhost:5432/boligas` | Matches `compose.yaml`. |
| `WEB_URL` | `http://localhost:3000` | Public origin of the web app; OAuth redirects back here. |
| `SESSION_SECRET` | 32+ random characters | Signs the session cookie. `openssl rand -base64 48` |
| `COOKIE_SECURE` | `false` | `true` (default) in production; `false` only for local http. |
| `TRUST_PROXY` | `true` | Read the client IP from `X-Forwarded-For`. `true` on Vercel; default `false`. |
| `PROXY_SECRET` | 32+ random characters | Optional. Shared with the web app, which forwards the visitor's IP for rate limiting. Without it every visitor behind the web proxy shares one limit. |
| `CRON_SECRET` | 32+ random characters | Optional. Protects the daily purge of deleted accounts (`GET /internal/purge-deleted-accounts`). Unset disables the endpoint. |
| `DIRECT_URL` | | Optional. Non-pooled connection used by migrations (Neon). Defaults to `DATABASE_URL`. |
| `DISCORD_CLIENT_ID` | | From the Discord application. |
| `DISCORD_CLIENT_SECRET` | | From the Discord application. Never commit it. |
| `DISCORD_REDIRECT_URI` | `http://localhost:3000/api/auth/discord/callback` | Must match the redirect registered in Discord. |
| `PORT` | `4000` | Optional. |

The API refuses to start when a required variable is missing or invalid.

### Web

| Variable | Default | Notes |
|----------|---------|-------|
| `API_URL` | `http://localhost:4000` | Where `/api/*` is forwarded (read at request time, no rebuild needed). The browser only talks to the web origin, so the session cookie stays first-party. |
| `PROXY_SECRET` | | Same value as the API's. Lets the API rate-limit each visitor by their real IP. |

### Discord application

1. Create an application at https://discord.com/developers/applications.
2. **OAuth2 → Redirects**: add the exact `DISCORD_REDIRECT_URI`.
3. Copy the client ID and secret into `apps/api/.env`.

Only the `identify` scope is requested (username and avatar).

## Deploy (Vercel + Neon, free tiers)

Two Vercel projects from this repository (web and API) and one Neon database. The web project proxies `/api/*` to the API, so visitors only ever see the web domain.

1. **Database (Neon).** Create a project and copy two connection strings: the **pooled** one (`DATABASE_URL`) and the **direct** one (`DIRECT_URL`).
2. **Schema and edition, from your machine:**
   ```bash
   DATABASE_URL=<pooled> DIRECT_URL=<direct> pnpm --filter api db:migrate
   DATABASE_URL=<pooled> EDITION_SLUG=express-2026 EDITION_NAME="Express 2026" \
   SIGNUP_OPENS_AT=2026-11-22T00:00:00Z SIGNUP_CLOSES_AT=2026-12-15T00:00:00Z \
     pnpm --filter api edition:upsert
   ```
3. **API project (Vercel).** Import the repository with **Root Directory** `apps/api` (framework: NestJS). Set:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Neon pooled URL |
   | `WEB_URL` | `https://<web-domain>` |
   | `SESSION_SECRET`, `PROXY_SECRET`, `CRON_SECRET` | Three different `openssl rand -base64 48` values |
   | `TRUST_PROXY` | `true` |
   | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | From the Discord application |
   | `DISCORD_REDIRECT_URI` | `https://<web-domain>/api/auth/discord/callback` |

   `apps/api/vercel.json` schedules the purge of deleted accounts daily at 04:00 UTC; Vercel sends `CRON_SECRET` with it.
4. **Web project (Vercel).** Import the repository again with **Root Directory** `apps/web` (framework: Next.js). Set `API_URL` to the API project's URL and `PROXY_SECRET` to the same value as the API's.
5. **Discord.** Add `https://<web-domain>/api/auth/discord/callback` under **OAuth2 → Redirects**.
6. **Check.** `https://<web-domain>/api/editions/current` returns the edition, and signing in brings you back to the site.

Known limits of the free setup: rate-limit counters live in each serverless instance (best effort, not exact across instances), and Vercel's Hobby plan is for non-commercial use.

## Editions

An edition is configured with a command, not with code. Running it again with the same slug updates the edition in place.

```bash
EDITION_SLUG=express-2026 EDITION_NAME="Express 2026" \
SIGNUP_OPENS_AT=2026-11-22T00:00:00Z SIGNUP_CLOSES_AT=2026-12-15T00:00:00Z \
  pnpm --filter api edition:upsert
```

- All dates are UTC. Signup is open from `SIGNUP_OPENS_AT` (inclusive) to `SIGNUP_CLOSES_AT` (exclusive).
- The active edition is the latest one whose signup has already opened. Creating next year's edition early does not hide the current one.

## Translating

The site picks the visitor's browser language and falls back to English when that language is not available. A language chosen in the menu is remembered and wins over the browser setting.

Adding a language takes two steps and no code:

1. Copy `apps/web/src/messages/en.json` to `apps/web/src/messages/<code>.json` (for example `pt-BR.json`) and translate the values.
2. Add the language to `apps/web/src/i18n/locales.ts`:
   ```ts
   { code: 'pt-BR', name: 'Português (Brasil)' },
   ```
   Use the language's own name. Add `dir: 'rtl'` for right-to-left scripts such as Arabic.

Partial translations are welcome: any key you leave out is shown in English. Run `pnpm --filter web test` before opening a pull request. The tests check that you:

- only use keys that exist in `en.json`,
- keep every `{placeholder}` exactly as in English (`{date}`, `{edition}`, `{name}`),
- leave no empty strings (remove the key instead).

The new language then appears in the site's language menu, in Storybook's toolbar and in automatic browser detection.

## Tests

Every behavior is developed test-first.

| Command | What it covers |
|---------|----------------|
| `pnpm --filter api test` | Use cases and config (unit). |
| `pnpm --filter api test:e2e` | HTTP flow with fakes: OAuth state, session, signup rules, security regressions. |
| `DATABASE_URL=<disposable db> pnpm --filter api test:int` | Prisma repositories against real PostgreSQL. **Truncates tables**: use a throwaway database such as `boligas_test`. |
| `pnpm --filter web test` | Store, API client and translations (unit), plus every Storybook story in Chromium. |

### Visual TDD with Storybook

Every story is a test: it renders, runs its `play` function, and is compared with its reference screenshot in `__screenshots__/`.

1. Write or change the story first. It fails because the reference is missing or different.
2. Build the component until the story looks and behaves as intended.
3. Run `pnpm --filter web test`. It creates any missing reference. **Review the PNG**, then run again to confirm it passes.
4. For an intended visual change, update references with `pnpm --filter web exec vitest run --project storybook -u`, then review the diff before committing.

Stories whose name ends in `Mobile` are captured at phone width (390px). Run Storybook with `pnpm --filter web storybook`; the toolbar switches between English and Spanish.

## Project layout

```
apps/
  api/   NestJS: auth (Discord OAuth, session) and judge-applications, each split into
         domain / application (use cases, ports) / infrastructure (Prisma, HTTP)
  web/   Next.js: landing and judge-signup (api client, Zustand store,
         presentational components with stories, container), i18n in src/messages
packages/
  shared/
```
