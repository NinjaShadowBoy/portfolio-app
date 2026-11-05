import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticleDataService } from '../../../../core/services/article-data.service';

/**
 * Read-only view of the published articles. Articles are Markdown files
 * compiled at build time (scripts/build-content.mjs), not database rows, so
 * they are written and edited in the repo and ship with the next deploy.
 */
@Component({
  selector: 'app-articles-panel',
  imports: [DatePipe, RouterLink],
  templateUrl: './articles-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class ArticlesPanelComponent {
  readonly articles = inject(ArticleDataService).articles;
}
