# Technical Writing System — Design Spec

**Date:** 2026-07-17
**Status:** Approved
**Repos:** `portfolio-app` (Angular 22 SSR, primary), `portfolio-backend-go` (Go/Gin + sqlc)

## Context & Goal

The portfolio currently optimizes for the wrong thing: it asks visitors to *do work*
(rate projects, comment) without giving them value. The owner's real goal is to
**build an audience** — search traffic and repeat developer visitors — and to feed
their LinkedIn distribution channel.

Audiences are built by **one engine run repeatedly and well**, not by a buffet of
one-off features. Two engines were chosen:

1. **Technical writing** (this spec) — the compounding SEO/shareable backbone.
2. **AI/LLM cost calculator** (separate later spec) — a recurring-traffic flagship tool.

This spec covers engine #1: turn the site from "look what I built" into a
**searchable, shareable technical blog**. The star-rating anti-feature is removed and
comments are reshaped into structured, actionable feedback.

### In scope
- Markdown-in-repo articles platform with build-time compilation.
- Bilingual (en/fr) article routing with graceful missing-translation fallback.
- Article index + article detail pages, new "Articles" nav entry, reserved "Tools" slot.
- Reading experience: syntax highlighting, tags, reading time, table of contents,
  a "Connections" block (related articles, related projects, research papers, LinkedIn post).
- SEO: per-article meta/OG/Twitter tags, JSON-LD `Article`, `hreflang`, `sitemap.xml`, RSS feed.
- Reshape comments → structured feedback (Critique / Suggestion / Feature request) on
  **projects and articles**; remove the public star rating UI.

### Out of scope (explicitly)
- The AI/LLM cost calculator (its own spec later; nav reserves a dormant "Tools" slot).
- Article search/filter (deferred until ~10 articles exist; tags are shown but not filterable yet).
- Deleting backend rating endpoints/tables + data migration (left dormant to avoid scope creep).

## Decisions (locked with owner)

| Decision | Choice |
| --- | --- |
| Primary goal | Build an audience |
| Engines | Technical writing (now) + AI cost calculator (later) |
| Build order | Writing system first |
| Content model | **Markdown in repo, prerendered** (Approach A) |
| Article i18n | **Bilingual en/fr** with graceful fallback |
| Star rating | **Removed** from UI (backend endpoints left dormant) |
| Comments | **Reshaped** into structured feedback: Critique / Suggestion / Feature request |
| Feedback scope | Projects **and** articles |
| Reading extras | TOC + Connections block (articles, projects, papers, LinkedIn); search deferred |

## Architecture

### 1. Content model — Markdown in repo

- Articles live at `src/content/articles/<slug>/en.md` and `<slug>/fr.md`. The per-slug
  folder holds the article's cover image and inline assets alongside the Markdown.
- **Frontmatter schema** (YAML):
  ```yaml
  title: string
  description: string        # used for meta description + card + OG
  date: ISO date             # first published
  updated: ISO date          # optional; last meaningful edit
  tags: [string, ...]
  coverImage: string         # relative path within the slug folder, or omitted
  draft: boolean             # excluded from index/sitemap/RSS when true
  connections:
    relatedArticles: [slug, ...]
    relatedProjects: [projectId, ...]
    researchPapers:
      - { title: string, url: string, authors: string }   # authors optional
    linkedInUrl: string      # the matching LinkedIn cross-post
  ```
- `readingTime`, heading anchors, and the TOC are **computed at build**, not authored.

### 2. Build-time compilation step

A Node script (run before `ng build`, wired into `package.json` scripts) that:
1. Walks `src/content/articles/**`, parses frontmatter (e.g. `gray-matter`).
2. Renders Markdown → HTML (e.g. `markdown-it` or `remark`).
3. **Syntax-highlights code at build time** with **Shiki** — no runtime highlighter, so
   the Lighthouse budget (700kB warn / 1.2MB error, FCP<1800ms) is preserved.
4. Computes reading time, injects heading anchor ids, extracts a TOC tree.
5. Emits:
   - `articles.manifest.json` — lean index (slug, title, description, date, tags,
     coverImage, readingTime, available langs, connections) for the list page + SEO gen.
   - Per-article rendered payload (HTML body + TOC) consumed by the detail route.
6. Generates SEO artifacts (see §5): `sitemap.xml` and the RSS/Atom feed into the build output.

Output goes to a generated folder consumed by Angular (kept out of hand-edited source).

### 3. Routing, SSR & prerender

- Routes: `/:lang/articles` (index), `/:lang/articles/:slug` (detail).
- `app.routes.server.ts`: register both with `getPrerenderParams` enumerating **every
  published slug × lang** from the manifest, so articles prerender fully on **both**
  GitHub Pages (static mirror) and the VPS SSR server.
- **Graceful i18n fallback**: if `fr.md` is missing for a slug, serve the `en` body with a
  small "not yet translated" notice instead of a 404. `draft: true` articles are excluded
  from index, sitemap, and RSS.

### 4. Article detail layout

Title → meta row (date · reading time · tags) → cover image (via existing `lazyLoad`
directive) → **sticky TOC** on desktop / collapsible on mobile → highlighted body →
**Connections block** (related articles · related projects · research papers · LinkedIn
post) → **structured feedback form**.

### 5. SEO (the audience driver — table stakes)

Rendered server-side via Angular `Meta`/`Title` services per article:
- `<title>`, meta description, canonical URL.
- Open Graph + Twitter Card tags (title, description, image = coverImage, type=article).
- JSON-LD `Article` structured data.
- `hreflang` alternate links for en/fr.
- Build-generated `sitemap.xml` (all published routes, per lang, with alternates).
- Build-generated **RSS/Atom feed**.

### 6. Structured feedback (reshape of comments)

- A comment gains `type ∈ { critique, suggestion, feature_request }`.
- Target becomes polymorphic: `projectId` **or** `articleSlug` (articles have no DB id).
- **Backend** (`portfolio-backend-go`): add a `type` column and a nullable `article_slug`
  column to the comments table (sqlc query + migration); keep the existing **anon-token**
  support so visitors can submit without a full account. Adjust DTO/handler/service and the
  `GET`/`POST` comment endpoints accordingly.
- **Frontend**: one reusable feedback component (type selector + textarea) mounted on
  **project pages and article pages**. Existing feedback renders grouped/labeled by type.
- **Star rating removed** from project UI: delete the widget, average-rating logic, and
  `rating.service` usage. Backend rating endpoints/tables remain dormant (deletion deferred).

### 7. Information architecture

Nav: **Home · Projects · Articles · About · Contact**, with a dormant **Tools** slot
reserved for the future calculator. Bilingual `/en/...` and `/fr/...` throughout.

## Styling

Reuse `src/styles.css` design tokens and utility classes (per `CLAUDE.md`): colors, text,
surfaces, borders, elevation, motion tokens; `.btn-*`, `.input-field`, `.surface-*`,
`.glass-morphism`, etc. Dark mode is automatic via tokens. Component `.css` holds only
component-specific layout; promote anything reusable to `src/styles.css`. No raw hex,
`rgba()`, or hardcoded shadows/durations where a token exists.

## Testing

Karma/Jasmine, specs next to components (existing convention):
- Build-script units: frontmatter parse, reading-time, TOC extraction, missing-translation
  fallback, draft exclusion.
- Feedback component: type selection + submit, anonymous path, per-type rendering.
- Article index + detail: rendering from manifest, meta/OG/JSON-LD tag assertions.
- Backend: comment create/list with `type` + `article_slug` targets (Go tests).

## Performance

- Build-time syntax highlighting (no runtime library).
- Images via existing `lazyLoad` directive.
- Article bodies loaded per-route; manifest kept lean.
- Stay within Lighthouse budgets (700kB warn / 1.2MB error, FCP<1800ms, LCP<2500ms,
  CLS<0.1, TBT<200ms).

## Deferred / follow-up

- AI/LLM cost calculator (separate spec) — fills the reserved "Tools" nav slot.
- Article search/filter — once ~10 articles exist.
- Deletion of dormant rating endpoints + data migration.
