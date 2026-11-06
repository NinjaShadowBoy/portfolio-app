# AGENTS.md - Portfolio App

## Project Overview

Angular 22 SSR portfolio site (Express server) with JWT auth, Cloudinary image hosting, and a custom CSS design system. Deployed as a Docker image that `.github/workflows/deploy.yml` ships to the VPS over ssh on every push to `main` (see `deploy/DEPLOY.md`). The SSR server is instrumented with OpenTelemetry via `otel/instrumentation.mjs`, active only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

## Commands

```bash
# Package manager: bun (not npm/yarn/pnpm)
bun install           # Install dependencies
bun start             # Dev server at localhost:4200
bun run build         # Production build (output: dist/portfolio-app/)
bun run build --localize # Build with i18n (en-US + fr)
bun run build:staging # Same build against the staging API
bun run serve         # Run the built SSR server on PORT (default 4000)
bun run test          # Vitest unit tests on jsdom (watch)
bun run test:ci       # One Vitest run, as in CI
bun run docker:build  # Build the deploy image; docker:run serves it on :4000
bun run ng extract-i18n --output-path src/locale  # Extract translatable strings
```

**No lint or typecheck scripts defined.** The project relies on Angular CLI build (`ng build`) to catch TS errors. Run `bun run build` to verify types.

## Architecture

- **SSR modes** (`src/app/app.routes.server.ts`):
  - `Client-only`: `admin`, `oauth2/redirect`
  - `Server` (default): all other routes including `home`, `projects`, `about`, `contact`, `login`
- **Entry points**: `src/main.ts` (browser), `src/main.server.ts` (SSR bootstrap), `src/server.ts` (Express server)
- **Server listens** on `HOST`:`PORT` env vars, default `127.0.0.1:4000` (the Docker image sets `HOST=0.0.0.0`)
- **Backend API**: `http://localhost:8081/portfolio/v1` (dev), `https://alexabena.me/portfolio/v1` (prod), `https://staging.alexabena.me/portfolio/v1` (staging build configuration) -  defined in `src/environments/`
- **Project structure**: `src/app/core/` (services, guards, interceptors, interfaces, directives, utils, constants), `src/app/features/` (page components), `src/app/shared/ui/` (reusable UI components)
- **Shared building blocks (reuse, do not re-implement)**: `SeoService` (title, description, canonical, hreflang, JSON-LD for every prerendered page; call `setPage()` and `clear()` on destroy), `TechTagsComponent` (technology chips with docs links, `variant="pill"` on project detail), `FlagComponent` (en/fr flag SVGs), `resolveCoverImage()` (article cover paths), `core/constants/contact.ts` (email/phone)

## Internationalization (i18n)

- **Source locale**: `en-US`
- **Target locales**: `fr` (expandable in `angular.json` → `i18n.locales`)
- **URL structure**: `en` is the source locale with an empty `subPath` (served at `/...`); `fr` is served under `/fr/...`. The locale prefix comes from the build's base href, not from a route parameter.
- **Default redirect**: `/` → `/home` (English)
- **Admin**: English-only (not translated)
- **Translation files**: `src/locale/messages.xlf` (source), `src/locale/messages.fr.xlf` (French)
- **Template marking**: `i18n` attribute on elements, `i18n-{attr}` for attributes
- **TS string marking**: `$localize` tagged template literals (no explicit import — global via polyfill)
- **Type declaration**: `src/types/localize.d.ts` declares `$localize` globally
- **Build**: `bun run build --localize` generates `dist/portfolio-app/browser/en-US/` and `dist/portfolio-app/browser/fr/`
- **Extraction**: `bun run ng extract-i18n --output-path src/locale` to regenerate `messages.xlf`
- **Language switcher**: Header component toggles between `/...` (en) and `/fr/...` routes

## Key Conventions

- **Package manager**: bun. Do not use npm, yarn, or pnpm. Bun blocks postinstall scripts by default; packages that need them are listed in `trustedDependencies` in `package.json`.
- **Component prefix**: `app` (configured in `angular.json`)
- **Styling -  keep it DRY**: Plain CSS with CSS custom properties. No Tailwind, no SCSS. `src/styles.css` (~1800 lines) already defines design tokens and utility classes for almost everything -  **reuse them, do not hardcode.** Before writing a new rule, check `src/styles.css` for an existing token or class.
  - **Use tokens, not literals**: colors (`--color-primary-*`, `--color-success/warning/danger/info-*`), text (`--text-primary/secondary/tertiary/link/link-hover/...`), surfaces (`--surface-base/raised/overlay/sunken/hover/...`), borders (`--border-subtle/default/emphasis/focus/...`), shadows/depth (`--elevation-0..5`, `--shadow-primary/...`), motion (`--motion-duration-fast`, `--motion-ease-out`). Never paste a raw hex, `rgba()`, box-shadow, or transition duration that a token already covers.
  - **Reuse utility classes** rather than re-declaring: `.btn-primary/.btn-secondary/.btn-ghost`, `.input-field`, `.liquid-glass`, `.liquid-glass-subtle`, `.interactive`, `.chip`, `.bg-/.text-/.border-` + `success/danger/info`.
  - **Dark mode is automatic** when you use tokens -  the token values are re-mapped under `[data-theme="dark"]`, so hardcoded colors silently break dark mode.
  - Within a component, collapse repeated declarations by grouping selectors (`.a, .b { ...shared... }`) instead of copy-pasting blocks. One-off literals are acceptable only where no token fits (e.g. an on-black fullscreen overlay).
  - Component `.css` files are scoped -  keep only component-specific layout there; promote anything reusable to `src/styles.css`.
- **Dark mode**: `[data-theme="dark"]` attribute on an ancestor element. System preference fallback via `@media (prefers-color-scheme: dark)` when no explicit theme is set.
- **State**: Angular signals + `rxResource` for async data (see `ProjectDataService`). No NgRx.
- **Fonts**: Product Sans (local TTF files in `src/assets/fonts/`), loaded via `@font-face` with `font-display: swap`.
- **Testing**: Vitest on jsdom through `@angular/build:unit-test`. Tests live next to components as `.spec.ts`. `vi` is global. Use `createSpyObj` from `src/testing/create-spy-obj.ts` for service doubles and `vi.useFakeTimers()` for time (no `fakeAsync`: the app is zoneless and zone.js is not installed). `src/testing/setup.ts` stubs browser APIs jsdom lacks. No e2e framework configured.
- **Environment files**: `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod) -  swapped via Angular build `fileReplacements`.
- **Auth**: JWT stored in `localStorage`. OAuth2 redirect flow via `/oauth2/redirect`. Admin route protected by `authGuard`.
- **Cloudinary**: Configured for image uploads (`cloudName: 'dct6fuenh'`, `uploadPreset: 'portfolio_unsigned'`).

## Performance Constraints

Lighthouse CI is configured (`lighthouserc.json`) with strict thresholds. If modifying layouts or adding assets, be aware:
- Initial bundle budget: 700kB warning, 1.2MB error
- FCP < 1800ms, LCP < 2500ms, CLS < 0.1, TBT < 200ms required
- Below-the-fold images use native `loading="lazy" decoding="async"`; above-the-fold images (home hero, article cover) load eagerly

## Gotchas

- `ng build` prerenders `articles` and `tools`, and the app shell (breadcrumb -> `ProjectDataService`) calls the API while rendering. `serverApiTimeoutInterceptor` caps every server-side API call at 2 s so an unresponsive API cannot stall or fail the build. Any new service called during SSR must handle the resulting `TimeoutError` with a fallback.
- The `public/` directory is copied as-is to the build output (favicon, logos).
- `src/assets/` is mapped to `/assets` in the build. Do not reference `src/assets` directly in component templates — use `assets/` path.
- `index.html` contains inline critical CSS; edit carefully.
