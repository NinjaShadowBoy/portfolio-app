import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ArticleDataService } from '../../../../core/services/article-data.service';
import { AdminComment, CommentTarget, Page } from '../../../../core/interfaces/admin.interface';
import { CommentType } from '../../../../core/services/comment.service';

const PAGE_SIZE = 25;

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  critique: 'Critique',
  suggestion: 'Suggestion',
  feature_request: 'Feature request',
};

/** Moderation feed of every feedback comment, on projects and articles. */
@Component({
  selector: 'app-feedback-panel',
  imports: [DatePipe, RouterLink],
  templateUrl: './feedback-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class FeedbackPanelComponent {
  private admin = inject(AdminService);
  private notification = inject(NotificationService);
  private articles = inject(ArticleDataService);

  readonly type = signal<CommentType | ''>('');
  readonly target = signal<CommentTarget | ''>('');
  readonly offset = signal(0);
  readonly busyId = signal<number | null>(null);
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
  readonly isLoading = this.commentsResource.isLoading;
  readonly failed = computed(() => this.commentsResource.status() === 'error');

  setType(value: string) {
    this.offset.set(0);
    this.type.set(value as CommentType | '');
  }

  setTarget(value: string) {
    this.offset.set(0);
    this.target.set(value as CommentTarget | '');
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
    if (!confirm(`Delete this ${COMMENT_TYPE_LABELS[comment.type].toLowerCase()} by ${comment.userName}?`)) return;

    this.busyId.set(comment.id);
    this.admin.deleteComment(comment.id).subscribe({
      next: () => {
        this.notification.success('Comment deleted.');
        this.busyId.set(null);
        if (this.page()?.items.length === 1 && this.offset() > 0) this.previousPage();
        else this.commentsResource.reload();
      },
      error: (err) => {
        console.error('Error deleting comment:', err);
        this.notification.error('Could not delete the comment.');
        this.busyId.set(null);
      },
    });
  }
}
