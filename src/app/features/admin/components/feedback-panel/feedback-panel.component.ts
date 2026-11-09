import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ArticleDataService } from '../../../../core/services/article-data.service';
import { injectDeferDelete } from '../../../../core/utils/deferred-action';
import { AdminComment, CommentTarget, Page } from '../../../../core/interfaces/admin.interface';
import { CommentType } from '../../../../core/services/comment.service';
import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { DataTableActionsDirective, DataTableCellDirective } from '../../../../shared/ui/data-table/data-table.directives';
import { DataTableColumn } from '../../../../shared/ui/data-table/data-table.model';

const PAGE_SIZE = 25;

/** Not sortable: the feed is paged by the server, newest first. */
const COMMENT_COLUMNS: DataTableColumn<AdminComment>[] = [
  { key: 'type', header: 'Type' },
  { key: 'target', header: 'On' },
  { key: 'body', header: 'Comment' },
  { key: 'author', header: 'From' },
  { key: 'createdAt', header: 'Posted' },
];

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  critique: 'Critique',
  suggestion: 'Suggestion',
  feature_request: 'Feature request',
};

/** Moderation feed of every feedback comment, on projects and articles. */
@Component({
  selector: 'app-feedback-panel',
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, DataTableActionsDirective],
  templateUrl: './feedback-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class FeedbackPanelComponent {
  private admin = inject(AdminService);
  private notification = inject(NotificationService);
  private articles = inject(ArticleDataService);
  private readonly deferDelete = injectDeferDelete();

  readonly type = signal<CommentType | ''>('');
  readonly target = signal<CommentTarget | ''>('');
  readonly offset = signal(0);
  /** Comments waiting out their Undo window. Deleted ids stay here; the server no longer returns them. */
  private readonly hiddenIds = signal<ReadonlySet<number>>(new Set());
  readonly typeLabels = COMMENT_TYPE_LABELS;
  readonly types = Object.keys(COMMENT_TYPE_LABELS) as CommentType[];

  private commentsResource = rxResource({
    params: () => ({
      type: this.type() || undefined,
      target: this.target() || undefined,
      offset: this.offset(),
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.admin.listComments(params),
  });

  readonly page = computed<Page<AdminComment> | null>(() =>
    this.commentsResource.hasValue() ? this.commentsResource.value() : null,
  );
  readonly comments = computed(() => {
    const hidden = this.hiddenIds();
    return (this.page()?.items ?? []).filter((comment) => !hidden.has(comment.id));
  });
  readonly filtered = computed(() => this.type() !== '' || this.target() !== '');
  /** Loaded, and nothing to list. */
  readonly empty = computed(() => {
    const page = this.page();
    // Everything there is was on this page, and all of it is gone or hidden.
    return !!page && !this.isLoading() && page.offset === 0 && page.items.length === page.total && this.comments().length === 0;
  });
  readonly columns = COMMENT_COLUMNS;
  readonly rowKey = (comment: AdminComment) => comment.id;
  readonly isLoading = this.commentsResource.isLoading;
  readonly failed = computed(() => this.commentsResource.status() === 'error');

  typeLabel(comment: AdminComment): string {
    return COMMENT_TYPE_LABELS[comment.type];
  }

  setType(value: string) {
    this.offset.set(0);
    this.type.set(value as CommentType | '');
  }

  setTarget(value: string) {
    this.offset.set(0);
    this.target.set(value as CommentTarget | '');
  }

  clearFilters() {
    this.offset.set(0);
    this.type.set('');
    this.target.set('');
  }

  previousPage() {
    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
  }

  nextPage() {
    this.offset.update((offset) => offset + PAGE_SIZE);
  }

  /** Article comments carry only the slug; the manifest supplies the title when it still exists. */
  articleTitle(slug: string): string {
    return this.articles.getArticleSummary(slug)?.title ?? slug;
  }

  deleteComment(comment: AdminComment) {
    this.deferDelete({
      hide: () => this.hiddenIds.update((ids) => new Set(ids).add(comment.id)),
      restore: () =>
        this.hiddenIds.update((ids) => {
          const next = new Set(ids);
          next.delete(comment.id);
          return next;
        }),
      commit: () =>
        this.admin.deleteComment(comment.id).pipe(
          tap(() => {
            // An emptied later page steps back instead of showing nothing.
            if (this.comments().length === 0 && this.offset() > 0) this.previousPage();
            else this.commentsResource.reload();
          })
        ),
      message: `Deleted the ${COMMENT_TYPE_LABELS[comment.type].toLowerCase()} by ${comment.userName}.`,
      errorMessage: 'Could not delete the comment. It is back in the list.',
    });
  }
}
