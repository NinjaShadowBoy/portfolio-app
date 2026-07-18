---
title: Hello World — Building a Markdown-Powered Writing System
description: A walkthrough of the build-time Markdown pipeline that powers this bilingual technical writing platform, from frontmatter to syntax-highlighted output.
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

## Introduction

Welcome to the very first article on this platform. This piece exists to exercise
every corner of the build-time content pipeline: frontmatter parsing, reading-time
estimation, table-of-contents extraction, heading anchors, and Shiki-based syntax
highlighting.

The goal was simple — author articles as plain Markdown in the repository, then
compile them into lean, prerendered payloads at build time so nothing extra ships
to the browser.

## Why Markdown in the Repo

Keeping content next to the code has real advantages:

- Articles are version-controlled alongside the app.
- Reviews happen through normal pull requests.
- No runtime CMS, no extra network round-trips, no client-side highlighter.

### Trade-offs We Accepted

There is no live preview and no non-technical editing UI yet. For a personal
technical writing system, that trade-off is comfortable.

## The Build Step

A small Node script walks `src/content/articles/**`, parses the YAML frontmatter,
renders the Markdown to HTML, and highlights code blocks with Shiki using CSS
variables so dark mode keeps working.

Here is a representative slice of the manifest shape it emits:

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
    description: 'A walkthrough of the build-time Markdown pipeline.',
    date: '2026-07-10',
    tags: ['angular', 'markdown'],
    readingTime: 3,
    langs: ['en', 'fr'],
  },
];
```

### Highlighting at Build Time

Because Shiki runs during the build, the client never downloads a syntax
highlighter. The Lighthouse performance budget stays intact.

```bash
node scripts/build-content.mjs
ng build --configuration production
```

## Bilingual by Design

Every slug can provide `en.md` and `fr.md`. When a French translation is missing,
the pipeline falls back to the English body and flags it as not yet translated —
so a half-translated site never 404s.

## Conclusion

If you are reading this rendered on the site, the whole pipeline works end to end:
frontmatter parsed, headings anchored, TOC built, and code highlighted. Onward to
the next article.
