# Portfolio App

My personal site: the projects I have built, the articles I write, and a couple
of small tools I wanted to exist. Angular 22 rendered on the server by Express,
compiled once per locale, with English at the site root and French under `/fr/`.

What is on it:

- **Projects** listed and detailed from the API, with photos on Cloudinary.
- **Articles** written as Markdown in `src/content/articles/`. The build
  compiles them into JSON payloads, a manifest, a sitemap and an RSS feed, and
  highlights code with Shiki at that point, so no highlighter ships to the
  browser. Article routes are prerendered.
- **Tools**, currently an [AI cost calculator](src/app/features/tools/ai-cost-calculator)
  that projects what an LLM workload costs per request, per day, per month and
  per user across 18 models. Prices are transcribed by hand from each provider's
  official page and the as-of date is shown in the UI, so stale data is
  self-disclosing.
- **Feedback** on any project or article: a typed note (critique, suggestion or
  feature request) that needs no account. The backend mints an anonymous
  identity cookie so the note survives across visits, and folds it into a real
  account if the reader later logs in.
- **Contact**, which emails me and stores the message.
- **Accounts** through email and password, Google or GitHub OAuth2, or GitHub's
  device flow at `/login/device`. The JWT lives in `localStorage`.
- **Admin** at `/admin`, behind `authGuard`: project create, edit and delete
  (form or raw JSON) plus the photo manager.

The JSON API behind all of it is
[portfolio-backend-go](https://github.com/NinjaShadowBoy/portfolio-backend-go),
mounted at `/portfolio/v1`.

## Getting started

The package manager is **bun**. npm, yarn and pnpm will produce a lockfile
nobody else uses.

Develop:

```bash
bun install
bun start                   # dev server at localhost:4200, API at localhost:8081
```

The dev server talks to the Go backend on `localhost:8081`. Without it running
the site still works: projects fall back to a built-in list and feedback forms
fail politely. Start it from `portfolio-backend-go` with `docker compose up`.

Build and run what production runs:

```bash
bun run build               # content:build, then ng build, into dist/portfolio-app/
bun run build:staging       # same, against the staging API
bun run serve               # run the built SSR server (PORT, or 4000)
bun run docker:build        # the deploy image, from the same Dockerfile CI uses
bun run docker:run          # serve that image on localhost:4000
```

Test:

```bash
bun run test                # Karma/Jasmine watcher
bun run test:ci             # one headless run, as in CI
bun run test:content        # article pipeline tests, against scripts/__fixtures__/
```

`bun run deploy` publishes the GitHub Pages build. The VPS deploy is the
Docker image, pushed by `.github/workflows/deploy.yml` (see `deploy/DEPLOY.md`).

There is no lint or typecheck script. `bun run build` is the type check. There
is no e2e framework either.

`src/generated/` is build output: never edit it, and note that a bare `ng build`
fails without it, which is why `bun run build` chains `content:build` first.

The build prerenders `articles` and `tools` pages, and rendering them calls the
API for the project list. On the server every API call gives up after 2 seconds
(`server-api-timeout.interceptor.ts`) and the page uses the fallback data, so a
slow or down API makes the build a few seconds longer instead of stalling it.
The Docker build prints nothing between `Building...` and the bundle table; two
minutes there is normal on a 4-CPU Docker VM.

## Where things are

- `src/app/core/` services, guards, interceptors, interfaces, directives
- `src/app/features/` one directory per page
- `src/app/shared/ui/` reusable components
- `src/content/articles/` the articles themselves, one directory per slug
  ([frontmatter contract](src/content/articles/README.md))
- `scripts/build-content.mjs` the Markdown to JSON build step
- `src/styles.css` the design tokens and utility classes, about 1600 lines of them

Two rules bite hardest. Styling is plain CSS with custom properties, and dark
mode works by remapping token values under `[data-theme="dark"]`, so a raw hex
silently breaks it: reuse the tokens in `src/styles.css` instead. And i18n is a
per-locale build, not a route parameter, so there is no `/:lang` segment
anywhere in the router.

[AGENTS.md](./AGENTS.md) covers both in full, along with the SSR render modes,
the Lighthouse budgets the build is held to, and the rest of the gotchas.
