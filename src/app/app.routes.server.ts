import { RenderMode, ServerRoute } from '@angular/ssr';
import { articlesManifest } from '../generated/articles-manifest';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'about',
    renderMode: RenderMode.Server
  },
  {
    path: 'contact',
    renderMode: RenderMode.Server
  },
  {
    path: 'login',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: 'oauth2/redirect',
    renderMode: RenderMode.Client
  },
  // Articles are statically prerendered (SSG) so GitHub Pages — which cannot run
  // Express SSR — serves real, SEO-complete HTML for every published article.
  // This is the repo's first-ever Prerender route.
  {
    path: 'articles',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'articles/:slug',
    renderMode: RenderMode.Prerender,
    // Enumerate SLUGS ONLY — never cross-product slug × lang here. Locales are
    // per-locale BUILDS (en at `/`, fr at `/fr`): `ng build --localize` runs the
    // whole prerender pass once per locale, so the lang axis is already covered.
    // Enumerating slug × lang would produce broken/duplicated prerender routes.
    // The manifest is emitted by `scripts/build-content.mjs` (task BP2) with
    // drafts already EXCLUDED at build time, so no draft filtering is needed here.
    async getPrerenderParams() {
      return articlesManifest.map((article) => ({ slug: article.slug }));
    }
  },
  // Tools pages are fully static (client-side calculators) and prerendered
  // for SEO. Bare paths only — locales are per-locale BUILDS (en at `/`,
  // fr at `/fr`), so never enumerate `/fr/...` variants here.
  {
    path: 'tools',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'tools/ai-cost-calculator',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
