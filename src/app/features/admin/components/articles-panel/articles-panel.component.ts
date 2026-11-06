import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticleDataService } from '../../../../core/services/article-data.service';
import { ArticleSummary } from '../../../../core/interfaces/article.interface';
import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { DataTableActionsDirective, DataTableCellDirective } from '../../../../shared/ui/data-table/data-table.directives';
import { DataTableColumn } from '../../../../shared/ui/data-table/data-table.model';

const ARTICLE_COLUMNS: DataTableColumn<ArticleSummary>[] = [
  { key: 'title', header: 'Article', sortable: true },
  { key: 'date', header: 'Published', sortable: true, width: '9rem' },
  { key: 'updated', header: 'Updated', sortable: true, width: '9rem' },
  { key: 'readingTime', header: 'Reading time', sortable: true, align: 'end', width: '8rem' },
];

/**
 * Read-only view of the published articles. Articles are Markdown files
 * compiled at build time (scripts/build-content.mjs), not database rows, so
 * they are written and edited in the repo and ship with the next deploy.
 */
@Component({
  selector: 'app-articles-panel',
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, DataTableActionsDirective],
  templateUrl: './articles-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class ArticlesPanelComponent {
  readonly articles = inject(ArticleDataService).articles;

  readonly columns = ARTICLE_COLUMNS;
  readonly rowKey = (article: ArticleSummary) => article.slug;
  readonly filterBy = (article: ArticleSummary) =>
    `${article.title} ${article.description} ${article.slug} ${article.langs.join(' ')}`;
}
