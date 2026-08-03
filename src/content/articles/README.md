# Articles

Real, publishable writing only. One directory per article, named by its URL slug:

```
src/content/articles/<slug>/
  en.md          # required — the slug is skipped without it
  fr.md          # optional — a missing translation falls back to the English body
```

`pnpm content:build` (chained ahead of `ng build`) compiles this directory into
`src/generated/`. Sample/fixture articles that exercise the pipeline live under
`scripts/__fixtures__/articles/` instead, so they never reach the site.

## Frontmatter

```yaml
---
title: "Article title"
description: One or two sentences; used for the card, meta description, and RSS.
date: 2026-08-03          # publication date; drives sort order and RSS pubDate
updated: 2026-08-10       # optional
tags: [angular, rust]
coverImage: cover.png     # optional; resolved under assets/articles/<slug>/
draft: false              # true excludes it from the manifest, sitemap, and RSS
connections:
  relatedArticles: [other-slug]
  relatedProjects: [1, 3]
  researchPapers:
    - title: Paper title
      url: https://example.com/paper
      authors: A. Author        # optional
  linkedInUrl: https://...      # optional
---
```

Body headings at `##`–`####` are auto-anchored and become the table of contents.
Fenced code blocks are highlighted at build time by Shiki in both themes, so no
highlighter ships to the browser — see `scripts/build-content.mjs`.
