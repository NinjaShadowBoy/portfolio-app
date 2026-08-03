---
title: Draft Sample — Should Never Appear in Production
description: A work-in-progress article marked as a draft; it must be excluded from the manifest, sitemap, and RSS feed by the build pipeline.
date: 2026-07-16
tags:
  - draft
  - work-in-progress
draft: true
connections:
  relatedArticles: []
  relatedProjects: []
  researchPapers: []
  linkedInUrl: ''
---

## Draft Notice

This article has `draft: true` in its frontmatter. The build script must exclude it
from the generated manifest, the sitemap, and the RSS feed. It should never be
reachable on the published site.

## Rough Notes

These are unpolished notes still being written.

### Open Questions

- Should draft slugs be buildable behind a preview flag later?
- How should draft-only assets be treated?

## A Placeholder Snippet

```javascript
// TODO: finish this example before publishing
const draft = true;
if (draft) {
  console.log('excluded from manifest, sitemap, and rss');
}
```

## Not Done Yet

The rest of this article is still to be written.
