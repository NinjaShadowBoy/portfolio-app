---
title: "English Only: Exercising the Missing-Translation Fallback"
description: This article intentionally ships without a French translation so the build pipeline's graceful fallback path is exercised end to end.
date: 2026-07-12
tags:
  - i18n
  - fallback
  - content-model
draft: false
connections:
  relatedArticles:
    - hello-world
  relatedProjects:
    - 1
  researchPapers: []
  # linkedInUrl: https://www.linkedin.com/posts/example-en-only
---

## Purpose

This slug provides only `en.md` — there is deliberately no `fr.md` alongside it.
When the build script resolves available languages for this article, French should
be marked as unavailable, and the French route should reuse the English body while
flagging it as "not yet translated."

## What Should Happen

- The manifest entry lists `langs: ['en']`, not `['en', 'fr']`.
- Visiting the French route still renders content instead of a 404.
- A visible notice tells French readers the translation is pending.

### Why This Matters

A bilingual site is rarely translated all at once. The fallback keeps every
published article reachable in both locales during the translation backlog.

## A Small Code Sample

Even a fallback article should exercise syntax highlighting and heading anchors:

```typescript
function resolveLangs(files: string[]): Array<'en' | 'fr'> {
  const langs: Array<'en' | 'fr'> = [];
  if (files.includes('en.md')) langs.push('en');
  if (files.includes('fr.md')) langs.push('fr');
  return langs;
}
```

## Conclusion

If this renders in French with a "not yet translated" notice, the graceful
fallback works exactly as designed.
