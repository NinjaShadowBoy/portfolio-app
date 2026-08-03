---
title: "Bonjour le monde : le pipeline Markdown derrière ce site"
description: "Comment les articles sont rédigés en Markdown dans le dépôt puis compilés au build : frontmatter, table des matières, coloration Shiki et repli en/fr."
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

## Pourquoi du Markdown dans le dépôt

Les articles sont de simples fichiers Markdown dans `src/content/articles/`,
compilés en charges utiles prérendues au moment du build. Rien de superflu n'est
envoyé au navigateur.

Cela apporte trois choses :

- Le contenu est versionné avec l'application.
- Les modifications passent par les pull requests habituelles.
- Aucun CMS à l'exécution, aucun coloriseur côté client.

### Le compromis

Il n'y a pas d'aperçu en direct ni d'interface d'édition pour les
non-développeurs. Pour un système d'écriture personnel, le prix est correct.

## L'étape de build

Un script Node parcourt le dossier de contenu, analyse le frontmatter YAML,
transforme le Markdown en HTML et colore le code avec Shiki en utilisant des
variables CSS pour que le mode sombre continue de fonctionner. Il calcule aussi
le temps de lecture et extrait la table des matières depuis les titres.

Le manifeste qu'il génère ressemble à ceci :

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
    description: 'Le pipeline Markdown compilé au build.',
    date: '2026-07-10',
    tags: ['angular', 'markdown'],
    readingTime: 1,
    langs: ['en', 'fr'],
  },
];
```

### Coloration au moment du build

Shiki s'exécute pendant le build : le client ne télécharge jamais de coloriseur
syntaxique et le budget Lighthouse reste intact.

```bash
node scripts/build-content.mjs
ng build --configuration production
```

## Bilingue par conception

Chaque slug peut fournir `en.md` et `fr.md`. Lorsque la traduction française
manque, le pipeline se rabat sur le corps anglais et le signale comme non
traduit, si bien qu'un site partiellement traduit ne renvoie jamais de 404.
