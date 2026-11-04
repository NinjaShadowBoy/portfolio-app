import { ArticleSummary } from '../interfaces/article.interface';

/**
 * Resolve an article's cover image to a servable URL. Manifest cover paths
 * are relative to the article's slug folder; absolute paths and full URLs are
 * used as-is. Returns `undefined` when the article has no cover.
 */
export function resolveCoverImage(article: ArticleSummary): string | undefined {
  const cover = article.coverImage;
  if (!cover) return undefined;
  if (/^(https?:)?\/\//.test(cover) || cover.startsWith('/')) return cover;
  return `/assets/articles/${article.slug}/${cover}`;
}
