import { Component, LOCALE_ID, inject } from '@angular/core';
import { ArticleDataService } from '../../core/services/article-data.service';
import { ArticleCardComponent } from '../../shared/ui/article-card/article-card.component';
import { MY_NAME, PUBLICATIONS, VENUES, VenueId } from './publications';

const ROLE: Record<number, string> = {
  1: $localize`:@@articlesRoleFirst:First author`,
  2: $localize`:@@articlesRoleSecond:Second author`,
  3: $localize`:@@articlesRoleThird:Third author`,
};

/**
 * Articles index: my research papers first (hard-coded in {@link PUBLICATIONS}),
 * grouped by venue, then any notes from the build-generated manifest.
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

  private readonly month = new Intl.DateTimeFormat(this.lang, { month: 'long', year: 'numeric' });
  private readonly megabytes = new Intl.NumberFormat(this.lang, { maximumFractionDigits: 1 });
  private readonly mbUnit = this.lang === 'fr' ? 'Mo' : 'MB';

  /** Venues, newest first, each with its papers in the order they are listed. */
  readonly venues = (Object.keys(VENUES) as VenueId[])
    .map((id) => {
      const papers = PUBLICATIONS.filter((p) => p.group === id).map((p) => ({
        ...p,
        role: ROLE[p.myPosition] ?? '',
        summaryText: p.summary[this.lang],
        noteText: p.note?.[this.lang],
        fileName: p.pdf.split('/').pop() ?? p.pdf,
        sizeText: `${this.megabytes.format(p.pdfBytes / 1_000_000)} ${this.mbUnit}`,
      }));
      const date = papers.map((p) => p.date).sort().at(-1) ?? '';
      return {
        id,
        name: VENUES[id].name,
        detail: VENUES[id].detail[this.lang],
        date,
        dateText: date ? this.month.format(new Date(`${date}-01T00:00:00Z`)) : '',
        papers,
      };
    })
    .filter((venue) => venue.papers.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}
