import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ArticleSummary } from '../../../core/interfaces/article.interface';
import { resolveCoverImage } from '../../../core/utils/article-cover';
import { CtaButtonComponent } from '../cta-button/cta-button.component';
import { LazyLoadDirective } from '../../../core/directives/lazy-load.directive';

/**
 * Article index card: cover image, title, meta chips (date, reading time),
 * description, tags, and a "Read" action linking to the detail route.
 */
@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [DatePipe, CtaButtonComponent, LazyLoadDirective],
  templateUrl: './article-card.component.html',
  styleUrls: ['./article-card.component.css'],
})
export class ArticleCardComponent {
  article = input.required<ArticleSummary>();

  /** Bound because cta-button takes its text as an input. */
  readonly readLabel = $localize`:Article card read action@@articleCardRead:Read`;

  readonly coverImageUrl = computed(() => resolveCoverImage(this.article()));
}
