import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticleDataService } from '../../core/services/article-data.service';
import { ArticleCardComponent } from '../../shared/ui/article-card/article-card.component';

/**
 * Articles index page — the writing-system counterpart to {@link ProjectsComponent}.
 *
 * Mirrors the projects list layout (`.articles-container` + `.articles-grid`,
 * swapping `app-project-card` for `app-article-card`). The list is read straight
 * from {@link ArticleDataService.articles}, which surfaces the build-generated
 * manifest with drafts already excluded — so there is no runtime loading state,
 * fetch, or draft filtering to do here.
 *
 * Tags are shown on each card but are intentionally NOT filterable: search/filter
 * is deferred per the design spec. i18n: locales are per-locale builds (en at `/`,
 * fr at `/fr`), so every string carries an explicit `@@id` and there is no `:lang`
 * route segment.
 */
@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, ArticleCardComponent],
  templateUrl: './articles.component.html',
  styleUrls: ['./articles.component.css'],
})
export class ArticlesComponent {
  private articleService = inject(ArticleDataService);

  /** Published article summaries, newest-first as emitted (drafts excluded at build). */
  public readonly articles = this.articleService.articles;
}
