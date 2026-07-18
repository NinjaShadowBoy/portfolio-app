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
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  CommentCreatePayload,
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
  tone: FeedbackTone;
}

interface CommentGroup extends CommentTypeOption {
  comments: CommentDto[];
}

/**
 * Reusable structured feedback thread. Mounts on both project and article pages
 * via two mutually-exclusive inputs — exactly one of `projectId` / `articleSlug`
 * must be provided. All CommentService calls are derived from a single target so
 * the component is target-agnostic. Anonymous submission works because the global
 * authInterceptor sets `withCredentials`; the first submit provisions an anon
 * identity which we pick up via identityService.refresh().
 */
@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, UserAvatarComponent, SegmentedToggleComponent],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css'],
})
export class FeedbackComponent {
  private commentService = inject(CommentService);
  identityService = inject(IdentityService); // public for the template
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  // Mutually-exclusive target inputs — exactly one must be set.
  projectId = input<number | null>(null);
  articleSlug = input<string | null>(null);

  // The three structured feedback types, in render order, with the semantic
  // tone used for their grouped badge/border.
  readonly typeOptions: readonly CommentTypeOption[] = [
    {
      value: 'critique',
      label: $localize`:@@feedbackTypeCritique:Critique`,
      tone: 'danger',
    },
    {
      value: 'suggestion',
      label: $localize`:@@feedbackTypeSuggestion:Suggestion`,
      tone: 'info',
    },
    {
      value: 'feature_request',
      label: $localize`:@@feedbackTypeFeatureRequest:Feature request`,
      tone: 'success',
    },
  ];

  // Selected type for the new-feedback form (defaults to critique).
  selectedType = signal<CommentType>('critique');

  comments = signal<CommentDto[]>([]);
  newCommentText = signal('');
  isSubmitting = signal(false);
  editingCommentId = signal<number | null>(null);
  editCommentText = signal('');

  // Derived target: exactly one of projectId / articleSlug. Null when neither
  // is set (misconfigured usage — guarded in dev below).
  readonly target = computed<{ projectId?: number; articleSlug?: string } | null>(() => {
    const pid = this.projectId();
    if (pid !== null && pid !== undefined) return { projectId: pid };
    const slug = this.articleSlug();
    if (slug !== null && slug !== undefined) return { articleSlug: slug };
    return null;
  });

  // Existing feedback grouped by type; empty groups are dropped.
  readonly groupedComments = computed<CommentGroup[]>(() => {
    const all = this.comments();
    return this.typeOptions
      .map((opt) => ({ ...opt, comments: all.filter((c) => c.type === opt.value) }))
      .filter((group) => group.comments.length > 0);
  });

  constructor() {
    // Dev-time guard: exactly one of the two target inputs must be set.
    effect(() => {
      const hasProject = this.projectId() !== null && this.projectId() !== undefined;
      const hasArticle = this.articleSlug() !== null && this.articleSlug() !== undefined;
      if (isDevMode() && hasProject === hasArticle) {
        console.error(
          '[FeedbackComponent] exactly one of [projectId] / [articleSlug] must be set ' +
            `(projectId=${this.projectId()}, articleSlug=${this.articleSlug()})`,
        );
      }
    });

    // Reload the thread whenever the target changes.
    effect(() => {
      const target = this.target();
      if (!target) {
        this.comments.set([]);
        return;
      }
      this.loadComments();
    });
  }

  private loadComments() {
    const target = this.target();
    if (!target) return;
    const request$ =
      target.projectId !== undefined
        ? this.commentService.getProjectComments(target.projectId)
        : this.commentService.getArticleComments(target.articleSlug!);

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

    const payload: CommentCreatePayload = {
      ...target,
      type: this.selectedType(),
      body,
    };

    this.isSubmitting.set(true);
    this.commentService
      .createComment(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.newCommentText.set('');
          this.loadComments();
          // First anonymous action provisions an identity; pick it up so the
          // new item is recognised as "yours" for edit/delete.
          this.identityService.refresh();
        },
        error: (err) => {
          this.notificationService.error(
            $localize`:@@commentSubmitFailed:Failed to post comment`,
          );
          console.error('Error posting feedback:', err);
        },
      });
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

    this.commentService
      .updateComment(comment.id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadComments();
        },
        error: (err) => {
          this.notificationService.error(
            $localize`:@@commentUpdateFailed:Failed to update comment`,
          );
          console.error('Error updating feedback:', err);
        },
      });
  }

  deleteComment(comment: CommentDto) {
    if (
      !confirm(
        $localize`:@@commentDeleteConfirm:Are you sure you want to delete this comment?`,
      )
    ) {
      return;
    }

    this.commentService
      .deleteComment(comment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success($localize`:@@commentDeleted:Comment deleted`);
          this.loadComments();
        },
        error: (err) => {
          this.notificationService.error(
            $localize`:@@commentDeleteFailed:Failed to delete comment`,
          );
          console.error('Error deleting feedback:', err);
        },
      });
  }
}
