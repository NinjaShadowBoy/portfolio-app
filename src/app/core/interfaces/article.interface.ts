/**
 * Article domain interfaces.
 *
 * These types describe the shapes emitted by the build-time content pipeline
 * (`scripts/build-content.mjs`, task BP2):
 *  - the lean manifest module `src/generated/articles-manifest.ts`
 *    (an `ArticleSummary[]`, drafts excluded), and
 *  - the per-article payloads `src/generated/articles/<slug>.<lang>.json`
 *    (served at `/assets/articles/<slug>.<lang>.json`).
 *
 * NOTE on i18n: locales are per-locale BUILDS (en at `/`, fr at `/fr`), not a
 * route param. `langs` records which translations an article actually ships; a
 * missing `fr` translation falls back to the `en` body flagged `notTranslated`.
 */

/** Locales the writing system supports. */
export type ArticleLang = 'en' | 'fr';

/** A cross-linked research paper referenced from an article's connections. */
export interface ResearchPaper {
  title: string;
  url: string;
  /** Comma-separated author list; optional. */
  authors?: string;
}

/**
 * The "Connections" block for an article: related content and cross-posts.
 * Related articles are referenced by slug, related projects by numeric id.
 */
export interface ArticleConnections {
  relatedArticles: string[];
  relatedProjects: number[];
  researchPapers: ResearchPaper[];
  /** LinkedIn cross-post URL, when one exists. */
  linkedInUrl?: string;
}

/**
 * A manifest row: the lean index entry used by the articles list page and for
 * SEO generation. Carries NO rendered body (bodies live in the per-article
 * payloads) to keep the manifest small. Drafts are excluded at build time.
 */
export interface ArticleSummary {
  slug: string;
  title: string;
  description: string;
  /** ISO date the article was first published. */
  date: string;
  /** ISO date of the last meaningful edit; optional. */
  updated?: string;
  tags: string[];
  /** Cover image path relative to the slug folder, when provided. */
  coverImage?: string;
  /** Estimated reading time in minutes, computed at build. */
  readingTime: number;
  /** Translations this article actually ships. */
  langs: ArticleLang[];
  connections: ArticleConnections;
}

/** A single heading node in the extracted table-of-contents tree. */
export interface TocNode {
  /** Heading anchor id (matches the `id` injected into the rendered heading). */
  id: string;
  /** Visible heading text. */
  text: string;
  /** Heading level (2 = h2, 3 = h3, ...). */
  level: number;
  children: TocNode[];
}

/**
 * The rendered payload for a single article in a single locale: highlighted
 * HTML body plus the TOC tree. Fetched per route for SPA client transitions;
 * prerendered HTML already covers first paint.
 */
export interface ArticlePayload {
  slug: string;
  /** The locale actually served (may differ from the requested one on fallback). */
  lang: ArticleLang;
  title: string;
  description: string;
  /** Build-time rendered, Shiki-highlighted HTML body. */
  html: string;
  toc: TocNode[];
  /**
   * True when a translation was requested but is unavailable, so the English
   * body is served instead. Drives the "not yet translated" notice.
   */
  notTranslated: boolean;
}
