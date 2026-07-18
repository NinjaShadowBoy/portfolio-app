---
title: Bonjour le monde — Construire un système d'écriture propulsé par Markdown
description: Une visite guidée du pipeline Markdown compilé au build qui alimente cette plateforme d'écriture technique bilingue, du frontmatter au rendu avec coloration syntaxique.
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

Bienvenue dans le tout premier article de cette plateforme. Cet article existe pour
exercer chaque recoin du pipeline de contenu compilé au build : analyse du
frontmatter, estimation du temps de lecture, extraction de la table des matières,
ancres de titres et coloration syntaxique via Shiki.

L'objectif était simple — rédiger les articles en Markdown dans le dépôt, puis les
compiler en charges utiles prérendues et légères au moment du build, afin que rien
de superflu ne soit envoyé au navigateur.

## Pourquoi du Markdown dans le dépôt

Garder le contenu près du code offre de réels avantages :

- Les articles sont versionnés avec l'application.
- Les relectures passent par les pull requests habituelles.
- Aucun CMS à l'exécution, aucun aller-retour réseau supplémentaire, aucun
  coloriseur côté client.

### Les compromis acceptés

Il n'y a pas encore d'aperçu en direct ni d'interface d'édition pour les
non-techniciens. Pour un système d'écriture technique personnel, ce compromis est
confortable.

## L'étape de build

Un petit script Node parcourt `src/content/articles/**`, analyse le frontmatter
YAML, transforme le Markdown en HTML et colore les blocs de code avec Shiki en
utilisant des variables CSS pour que le mode sombre continue de fonctionner.

Voici une tranche représentative de la structure du manifeste qu'il génère :

```typescript
export interface ArticleManifestEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readingTime: number; // minutes, calculé au build
  langs: Array<'en' | 'fr'>;
}

export const ARTICLES: ArticleManifestEntry[] = [
  {
    slug: 'hello-world',
    title: 'Bonjour le monde',
    description: 'Une visite guidée du pipeline Markdown compilé au build.',
    date: '2026-07-10',
    tags: ['angular', 'markdown'],
    readingTime: 3,
    langs: ['en', 'fr'],
  },
];
```

### Coloration au moment du build

Comme Shiki s'exécute pendant le build, le client ne télécharge jamais de
coloriseur syntaxique. Le budget de performance Lighthouse reste intact.

```bash
node scripts/build-content.mjs
ng build --configuration production
```

## Bilingue par conception

Chaque slug peut fournir `en.md` et `fr.md`. Lorsqu'une traduction française est
absente, le pipeline se rabat sur le corps anglais et le signale comme non encore
traduit — ainsi, un site partiellement traduit ne renvoie jamais de 404.

## Conclusion

Si vous lisez ceci rendu sur le site, tout le pipeline fonctionne de bout en bout :
frontmatter analysé, titres ancrés, table des matières construite et code coloré.
En route pour le prochain article.
