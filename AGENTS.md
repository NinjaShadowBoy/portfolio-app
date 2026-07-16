# AGENTS.md - Portfolio App

## Project Overview

Angular 22 SSR portfolio site (Express server) with JWT auth, Cloudinary image hosting, and a custom CSS design system. Deployed to GitHub Pages and a VPS.

## Commands

```bash
# Package manager: pnpm (not npm/yarn)
pnpm install          # Install dependencies
pnpm start            # Dev server at localhost:4200
pnpm build            # Production build (output: dist/portfolio-app/)
pnpm build --localize # Build with i18n (en-US + fr)
pnpm test             # Karma/Jasmine unit tests
pnpm run build:gh-pages  # Build for GitHub Pages deployment
pnpm run deploy       # Deploy to GitHub Pages via angular-cli-ghpages
pnpm ng extract-i18n --output-path src/locale  # Extract translatable strings
```

**No lint or typecheck scripts defined.** The project relies on Angular CLI build (`ng build`) to catch TS errors. Run `pnpm build` to verify types.

## Architecture

- **SSR modes** (`src/app/app.routes.server.ts`):
  - `Prerender`: `/:lang/about`, `/:lang/contact`, `/:lang/login` (with `getPrerenderParams` for en/fr)
  - `Client-only`: `/:lang/admin`, `/:lang/oauth2/redirect`
  - `Server` (default): all other routes including `/:lang/home`, `/:lang/projects`
- **Entry points**: `src/main.ts` (browser), `src/main.server.ts` (SSR bootstrap), `src/server.ts` (Express server)
- **Server listens** on `PORT` env var or `4000`
- **Backend API**: `http://localhost:8081/portfolio` (dev), `https://vps.alexabena.me/portfolio` (prod) -  defined in `src/environments/`
- **Project structure**: `src/app/core/` (services, guards, interceptors, interfaces, directives), `src/app/features/` (page components), `src/app/shared/ui/` (reusable UI components)

## Internationalization (i18n)

- **Source locale**: `en-US`
- **Target locales**: `fr` (expandable in `angular.json` → `i18n.locales`)
- **URL structure**: `/en/...` and `/fr/...` prefixes via `/:lang` route parameter
- **Default redirect**: `/` → `/en/home`
- **Admin**: English-only (not translated)
- **Translation files**: `src/locale/messages.json` (source), `src/locale/messages.fr.json` (French)
- **Template marking**: `i18n` attribute on elements, `i18n-{attr}` for attributes
- **TS string marking**: `$localize` tagged template literals (no explicit import -  global via polyfill)
- **Type declaration**: `src/types/localize.d.ts` declares `$localize` globally
- **Build**: `pnpm build --localize` generates `dist/portfolio-app/browser/en-US/` and `dist/portfolio-app/browser/fr/`
- **Extraction**: `pnpm ng extract-i18n --output-path src/locale` to regenerate `messages.json`
- **Language switcher**: Header component toggles between `/en/...` and `/fr/...` routes

## Key Conventions

- **Package manager**: pnpm. Do not use npm or yarn.
- **Component prefix**: `app` (configured in `angular.json`)
- **Styling -  keep it DRY**: Plain CSS with CSS custom properties. No Tailwind, no SCSS. `src/styles.css` (~1600 lines) already defines design tokens and utility classes for almost everything -  **reuse them, do not hardcode.** Before writing a new rule, check `src/styles.css` for an existing token or class.
  - **Use tokens, not literals**: colors (`--color-primary-*`, `--color-success/warning/danger/info-*`), text (`--text-primary/secondary/tertiary/link/link-hover/...`), surfaces (`--surface-base/raised/overlay/sunken/hover/...`), borders (`--border-subtle/default/emphasis/focus/...`), shadows/depth (`--elevation-0..5`, `--shadow-primary/...`), motion (`--motion-duration-fast`, `--motion-ease-out`). Never paste a raw hex, `rgba()`, box-shadow, or transition duration that a token already covers.
  - **Reuse utility classes** rather than re-declaring: `.btn-primary/.btn-secondary/.btn-ghost`, `.input-field`, `.surface-*`, `.elevation-*`, `.glass-morphism`, `.liquid-glass*`, `.gradient-*`, `.interactive`, `.focus-ring`, `.text-success/warning/danger/info`.
  - **Dark mode is automatic** when you use tokens -  the token values are re-mapped under `[data-theme="dark"]`, so hardcoded colors silently break dark mode.
  - Within a component, collapse repeated declarations by grouping selectors (`.a, .b { ...shared... }`) instead of copy-pasting blocks. One-off literals are acceptable only where no token fits (e.g. an on-black fullscreen overlay).
  - Component `.css` files are scoped -  keep only component-specific layout there; promote anything reusable to `src/styles.css`.
- **Dark mode**: `[data-theme="dark"]` attribute on an ancestor element. System preference fallback via `@media (prefers-color-scheme: dark)` when no explicit theme is set.
- **State**: Angular signals + `rxResource` for async data (see `ProjectDataService`). No NgRx.
- **Fonts**: Product Sans (local TTF files in `src/assets/fonts/`), loaded via `@font-face` with `font-display: swap`.
- **Testing**: Karma + Jasmine. Tests live next to components as `.spec.ts`. No e2e framework configured.
- **Environment files**: `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod) -  swapped via Angular build `fileReplacements`.
- **Auth**: JWT stored in `localStorage`. OAuth2 redirect flow via `/oauth2/redirect`. Admin route protected by `authGuard`.
- **Cloudinary**: Configured for image uploads (`cloudName: 'dct6fuenh'`, `uploadPreset: 'portfolio_unsigned'`).

## Performance Constraints

Lighthouse CI is configured (`lighthouserc.json`) with strict thresholds. If modifying layouts or adding assets, be aware:
- Initial bundle budget: 700kB warning, 1.2MB error
- FCP < 1800ms, LCP < 2500ms, CLS < 0.1, TBT < 200ms required
- Images use lazy loading via custom `lazyLoad` directive (`src/app/core/directives/lazy-load.directive.ts`)

## Gotchas

- The `public/` directory is copied as-is to the build output (favicon, 404.html, .nojekyll, _headers).
- `src/assets/` is mapped to `/assets` in the build. Do not reference `src/assets` directly in component templates -  use `assets/` path.
- `index.html` contains inline critical CSS and SPA routing hack for GitHub Pages -  edit carefully.
- `src/app/app.routes.server.ts` has a duplicate `/login` entry (prerender + client). This appears intentional but is unusual -  verify before modifying.
- The `.htaccess` file is empty; SPA routing is handled by the GitHub Pages script in `index.html`.
