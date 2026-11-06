import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import {
  CommentDto,
  CommentService,
  CommentType,
} from '../../../core/services/comment.service';
import { IdentityService } from '../../../core/services/identity.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { SegmentedToggleComponent } from '../segmented-toggle/segmented-toggle.component';

type FeedbackTone = 'danger' | 'info' | 'success';

interface CommentTypeOption {
  value: CommentType;
  label: string;
  shortLabel?: string;
  tone: FeedbackTone;
}

interface CommentGroup extends CommentTypeOption {
  comments: CommentDto[];
}

/** Exactly one of `projectId` / `articleSlug`, as the create payload expects. */
type FeedbackTarget = { projectId: number } | { articleSlug: string };

/**
 * Reusable structured feedback thread. Mounts on both project and article pages
 * via two mutually-exclusive inputs: exactly one of `projectId` / `articleSlug`
 * must be provided. Anonymous submission works because the global
 * authInterceptor sets `withCredentials`; the first submit provisions an anon
 * identity which is picked up via identityService.refresh().
 */
@Component({
  selector: 'app-feedback',
  imports: [DatePipe, UserAvatarComponent, SegmentedToggleComponent],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.css',
})
export class FeedbackComponent {
  private commentService = inject(CommentService);
  identityService = inject(IdentityService); // public for the template
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  projectId = input<number | null>(null);
  articleSlug = input<string | null>(null);

  /** The three feedback types, in render order, with the tone of their badge. */
  readonly typeOptions: readonly CommentTypeOption[] = [
    { value: 'critique', label: $localize`:@@feedbackTypeCritique:Critique`, tone: 'danger' },
    { value: 'suggestion', label: $localize`:@@feedbackTypeSuggestion:Suggestion`, tone: 'info' },
    {
      value: 'feature_request',
      label: $localize`:@@feedbackTypeFeatureRequest:Feature request`,
      shortLabel: $localize`:@@feedbackTypeFeatureRequestShort:Feature`,
      tone: 'success',
    },
  ];

  selectedType = signal<CommentType>('critique');
  comments = signal<CommentDto[]>([]);
  /** The form starts folded when there is no feedback yet; the visitor opens it. */
  formOpen = signal(false);
  readonly showForm = computed(() => this.formOpen() || this.comments().length > 0);
  newCommentText = signal('');
  isSubmitting = signal(false);
  editingCommentId = signal<number | null>(null);
  editCommentText = signal('');

  /** Null when neither input is set (misconfigured usage, reported in dev). */
  readonly target = computed<FeedbackTarget | null>(() => {
    const projectId = this.projectId();
    const articleSlug = this.articleSlug();
    if (projectId != null) return { projectId };
    if (articleSlug != null) return { articleSlug };
    return null;
  });

  /** Existing feedback grouped by type; empty groups are dropped. */
  readonly groupedComments = computed<CommentGroup[]>(() =>
    this.typeOptions
      .map((opt) => ({ ...opt, comments: this.comments().filter((c) => c.type === opt.value) }))
      .filter((group) => group.comments.length > 0)
  );

  constructor() {
    effect(() => {
      const hasProject = this.projectId() != null;
      const hasArticle = this.articleSlug() != null;
      if (isDevMode() && hasProject === hasArticle) {
        console.error(
          '[FeedbackComponent] exactly one of [projectId] / [articleSlug] must be set ' +
            `(projectId=${this.projectId()}, articleSlug=${this.articleSlug()})`
        );
      }
    });

    // Reload the thread whenever the target changes.
    effect(() => (this.target() ? this.loadComments() : this.comments.set([])));
  }

  private loadComments() {
    const target = this.target();
    if (!target) return;
    const request$ =
      'projectId' in target
        ? this.commentService.getProjectComments(target.projectId)
        : this.commentService.getArticleComments(target.articleSlug);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (comments) => this.comments.set(comments),
      error: (err) => console.error('Error loading feedback:', err),
    });
  }

  /** Segmented-toggle handler; values always come from `typeOptions`. */
  selectType(type: string) {
    this.selectedType.set(type as CommentType);
  }

  isMyComment(comment: CommentDto): boolean {
    return this.identityService.identity()?.id === comment.userId;
  }

  addComment() {
    const target = this.target();
    const body = this.newCommentText().trim();
    if (!target || this.isSubmitting() || !body) return;

    this.isSubmitting.set(true);
    this.mutate(
      this.commentService
        .createComment({ ...target, type: this.selectedType(), body })
        .pipe(finalize(() => this.isSubmitting.set(false))),
      $localize`:@@commentSubmitFailed:Failed to post comment`,
      () => {
        this.newCommentText.set('');
        // The first anonymous action provisions an identity; pick it up so the
        // new item is recognised as "yours" for edit/delete.
        this.identityService.refresh();
      }
    );
  }

  startEdit(comment: CommentDto) {
    this.editingCommentId.set(comment.id);
    this.editCommentText.set(comment.body);
  }

  cancelEdit() {
    this.editingCommentId.set(null);
    this.editCommentText.set('');
  }

  saveEdit(comment: CommentDto) {
    const body = this.editCommentText().trim();
    if (!body) return;
    this.mutate(
      this.commentService.updateComment(comment.id, body),
      $localize`:@@commentUpdateFailed:Failed to update comment`,
      () => this.cancelEdit()
    );
  }

  deleteComment(comment: CommentDto) {
    if (!confirm($localize`:@@commentDeleteConfirm:Are you sure you want to delete this comment?`)) {
      return;
    }
    this.mutate(
      this.commentService.deleteComment(comment.id),
      $localize`:@@commentDeleteFailed:Failed to delete comment`,
      () => this.notificationService.success($localize`:@@commentDeleted:Comment deleted`)
    );
  }

  /** Run a write, then reload the thread; on failure notify and log. */
  private mutate(request$: Observable<unknown>, failureMessage: string, onSuccess: () => void) {
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        onSuccess();
        this.loadComments();
      },
      error: (err) => {
        this.notificationService.error(failureMessage);
        console.error('Feedback request failed:', err);
      },
    });
  }
}
