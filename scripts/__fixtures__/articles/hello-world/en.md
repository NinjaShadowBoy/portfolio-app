---
title: "Hello World: the Markdown pipeline behind this site"
description: How articles here are authored as Markdown in the repo and compiled at build time, including frontmatter, TOC, Shiki highlighting, and the en/fr fallback.
date: 2026-07-10
updated: 2026-07-15
tags:
  - angular
  - markdown
  - build-tooling
  - i18n
coverImage: cover.png
draft: false
connections:
  relatedArticles:
    - en-only
  relatedProjects:
    - 1
    - 3
  researchPapers:
    - title: A Comprehensive Survey of Static Site Generation
      url: https://example.org/papers/ssg-survey
      authors: A. Abena, J. Doe
    - title: Incremental Markdown Compilation at Scale
      url: https://example.org/papers/incremental-markdown
  linkedInUrl: https://www.linkedin.com/posts/example-hello-world
---

## Why Markdown in the repo

Articles are plain Markdown files in `src/content/articles/`, compiled into
prerendered payloads at build time. Nothing extra ships to the browser.

That buys three things:

- Content is version-controlled with the app.
- Edits go through normal pull requests.
- No runtime CMS, no client-side highlighter.

### The trade-off

There is no live preview and no editing UI for non-developers. For a personal
writing system, that is a fine price.

## The build step

A Node script walks the content directory, parses the YAML frontmatter, renders
the Markdown to HTML, and highlights code with Shiki using CSS variables so dark
mode keeps working. It also computes reading time and extracts the table of
contents from the headings.

The manifest it emits looks like this:

```typescript
export interface ArticleManifestEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readingTime: number; // minutes, computed at build
  langs: Array<'en' | 'fr'>;
}

export const ARTICLES: ArticleManifestEntry[] = [
  {
    slug: 'hello-world',
    title: 'Hello World',
    description: 'The build-time Markdown pipeline.',
    date: '2026-07-10',
    tags: ['angular', 'markdown'],
    readingTime: 1,
    langs: ['en', 'fr'],
  },
];
```

### Highlighting at build time

Shiki runs during the build, so the client never downloads a syntax highlighter
and the Lighthouse budget stays intact.

```bash
node scripts/build-content.mjs
ng build --configuration production
```

## Bilingual by design

Each slug can provide `en.md` and `fr.md`. When the French translation is
missing, the pipeline falls back to the English body and marks it as untranslated,
so a half-translated site never 404s.
