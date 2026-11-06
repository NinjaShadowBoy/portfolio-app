import { Component, LOCALE_ID, inject } from '@angular/core';
import { ArticleDataService } from '../../core/services/article-data.service';
import { ArticleCardComponent } from '../../shared/ui/article-card/article-card.component';
import { MY_NAME, PUBLICATIONS } from './publications';

/**
 * Articles index: my research papers first (hard-coded in {@link PUBLICATIONS}),
 * then any notes from the build-generated manifest.
 */
@Component({
  selector: 'app-articles',
  imports: [ArticleCardComponent],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.css',
})
export class ArticlesComponent {
  private articleService = inject(ArticleDataService);
  private readonly lang = inject(LOCALE_ID).startsWith('fr') ? 'fr' : 'en';

  /** Published article summaries, newest-first as emitted (drafts excluded at build). */
  public readonly articles = this.articleService.articles;

  readonly myName = MY_NAME;
  readonly downloadLabel = $localize`:@@articlesDownloadPdfLabel:Download PDF`;

  readonly publications = [...PUBLICATIONS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({
      ...p,
      venueText: p.venue[this.lang],
      summaryText: p.summary[this.lang],
      noteText: p.note?.[this.lang],
      dateText: new Intl.DateTimeFormat(this.lang, { month: 'short', year: 'numeric' }).format(
        new Date(`${p.date}-01T00:00:00Z`),
      ),
    }));
}
