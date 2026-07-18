import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticleSummary } from '../../../core/interfaces/article.interface';
import { CtaButtonComponent } from '../cta-button/cta-button.component';
import { LazyLoadDirective } from '../../../core/directives/lazy-load.directive';

/**
 * Article index card — the writing-system counterpart to {@link ProjectCardComponent}.
 *
 * Renders a single {@link ArticleSummary} (a manifest row, no rendered body) as a
 * card: cover image, title, meta chips (published date · reading time), description,
 * tags, and a "Read" action linking to the detail route. Standalone, signal-input
 * based, and styled entirely from the shared design tokens / promoted utility classes
 * (`.tag`, card shell) so dark mode is automatic.
 */
@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [CommonModule, CtaButtonComponent, LazyLoadDirective],
  templateUrl: './article-card.component.html',
  styleUrls: ['./article-card.component.css'],
})
export class ArticleCardComponent {
  /** The manifest row this card renders. */
  article = input.required<ArticleSummary>();

  /** i18n "Read" label for the CTA (bound because cta-button takes text as an input). */
  readonly readLabel = $localize`:Article card read action@@articleCardRead:Read`;

  /**
   * Resolve the cover image to a servable URL. Cover paths in the manifest are
   * relative to the article's slug folder; absolute paths and full URLs are used
   * as-is. Returns `undefined` when the article has no cover image.
   */
  readonly coverImageUrl = computed<string | undefined>(() => {
    const article = this.article();
    const cover = article.coverImage;
    if (!cover) {
      return undefined;
    }
    if (/^(https?:)?\/\//.test(cover) || cover.startsWith('/')) {
      return cover;
    }
    return `/assets/articles/${article.slug}/${cover}`;
  });
}
