
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs/operators';
import { ProjectDataService } from '../../core/services/project-data.service';
import { RatingDto } from '../../core/services/rating.service';
import { CommentDto, CommentService } from '../../core/services/comment.service';
import { IdentityService } from '../../core/services/identity.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project } from '../../core/interfaces/project.interface';
import { environment } from '../../../environments/environment';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { CarouselComponent } from '../../shared/ui/carousel/carousel.component';
import { TechnologiesService } from '../../core/services/technologies.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, UserAvatarComponent, CarouselComponent],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
})
export class ProjectDetailComponent {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);
  private commentService = inject(CommentService);
  identityService = inject(IdentityService); // public for template
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);
  private techService = inject(TechnologiesService);

  private projectId = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('id');
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
      })
    ),
    { initialValue: null }
  );

  readonly project = computed<Project | undefined>(() => {
    const id = this.projectId();
    return id ? this.projectService.getProject(id) : undefined;
  });

  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  // Rating state (one editable star per identity per project).
  ratings = signal<RatingDto[]>([]);
  averageRating = signal(0);
  ratingCount = signal(0);
  hoveredStar = signal(0);
  isSubmittingRating = signal(false);

  // Comment thread state (many comments per identity per project).
  comments = signal<CommentDto[]>([]);
  newCommentText = signal('');
  isSubmittingComment = signal(false);
  editingCommentId = signal<number | null>(null);
  editCommentText = signal('');

  readonly stars = [1, 2, 3, 4, 5];

  // The current identity's star for this project, or null if not rated yet.
  readonly userRating = computed<RatingDto | null>(() => {
    const id = this.identityService.identity()?.id;
    if (!id) return null;
    return this.ratings().find((r) => r.userId === id) ?? null;
  });

  readonly selectedRating = computed(() => this.userRating()?.rating ?? 0);

  private readonly projectEffect = effect(() => {
    const project = this.project();
    if (!project) {
      this.resetState();
      return;
    }
    this.averageRating.set(project.averageRating);
    this.ratingCount.set(project.totalRatings);
    this.loadRatings(project.id);
    this.loadComments(project.id);
  });

  private resetState() {
    this.ratings.set([]);
    this.comments.set([]);
    this.hoveredStar.set(0);
    this.newCommentText.set('');
    this.editingCommentId.set(null);
    this.averageRating.set(0);
    this.ratingCount.set(0);
  }

  private loadRatings(projectId: number) {
    this.projectService
      .getProjectRatings(projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ratings) => this.applyRatings(ratings),
        error: (err) => console.error('Error loading ratings:', err),
      });
  }

  private applyRatings(ratings: RatingDto[]) {
    this.ratings.set(ratings);
    this.ratingCount.set(ratings.length);
    this.averageRating.set(
      ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0
    );
  }

  private loadComments(projectId: number) {
    this.commentService
      .getProjectComments(projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => this.comments.set(comments),
        error: (err) => console.error('Error loading comments:', err),
      });
  }

  // --- Rating ---

  onStarHover(star: number) {
    this.hoveredStar.set(star);
  }

  onStarLeave() {
    this.hoveredStar.set(0);
  }

  onStarClick(star: number) {
    const project = this.project();
    if (!project || this.isSubmittingRating()) return;

    this.isSubmittingRating.set(true);
    const existing = this.userRating();
    const request$ = existing
      ? this.projectService.updateRating(existing.id, star)
      : this.projectService.addRating(project.id, star);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingRating.set(false))
      )
      .subscribe({
        next: () => {
          this.notificationService.success(
            existing
              ? $localize`:@@ratingUpdated:Rating updated successfully`
              : $localize`:@@ratingSubmitted:Rating submitted successfully`
          );
          this.loadRatings(project.id);
          // First anonymous action provisions an identity; pick it up so the
          // star highlights as "yours".
          this.identityService.refresh();
        },
        error: (err) => {
          this.notificationService.error($localize`:@@ratingSubmitFailed:Failed to submit rating`);
          console.error('Error saving rating:', err);
        },
      });
  }

  deleteRating() {
    const rating = this.userRating();
    const project = this.project();
    if (!rating || !project) return;
    if (!confirm($localize`:@@ratingDeleteConfirm:Are you sure you want to delete your rating?`)) return;

    this.projectService
      .deleteRating(rating.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success($localize`:@@ratingDeleted:Rating deleted successfully`);
          this.loadRatings(project.id);
        },
        error: (err) => {
          this.notificationService.error($localize`:@@ratingDeleteFailed:Failed to delete rating`);
          console.error('Error deleting rating:', err);
        },
      });
  }

  isStarFilled(star: number): boolean {
    const displayRating = this.hoveredStar() || this.selectedRating();
    return star <= displayRating;
  }

  // --- Comments ---

  isMyComment(comment: CommentDto): boolean {
    return this.identityService.identity()?.id === comment.userId;
  }

  addComment() {
    const project = this.project();
    const body = this.newCommentText().trim();
    if (!project || this.isSubmittingComment() || !body) return;

    this.isSubmittingComment.set(true);
    this.commentService
      .createComment(project.id, body)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingComment.set(false))
      )
      .subscribe({
        next: () => {
          this.newCommentText.set('');
          this.loadComments(project.id);
          this.identityService.refresh();
        },
        error: (err) => {
          this.notificationService.error($localize`:@@commentSubmitFailed:Failed to post comment`);
          console.error('Error posting comment:', err);
        },
      });
  }

  startEditComment(comment: CommentDto) {
    this.editingCommentId.set(comment.id);
    this.editCommentText.set(comment.body);
  }

  cancelEditComment() {
    this.editingCommentId.set(null);
    this.editCommentText.set('');
  }

  saveEditComment(comment: CommentDto) {
    const project = this.project();
    const body = this.editCommentText().trim();
    if (!project || !body) return;

    this.commentService
      .updateComment(comment.id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelEditComment();
          this.loadComments(project.id);
        },
        error: (err) => {
          this.notificationService.error($localize`:@@commentUpdateFailed:Failed to update comment`);
          console.error('Error updating comment:', err);
        },
      });
  }

  deleteComment(comment: CommentDto) {
    const project = this.project();
    if (!project) return;
    if (!confirm($localize`:@@commentDeleteConfirm:Are you sure you want to delete this comment?`)) return;

    this.commentService
      .deleteComment(comment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success($localize`:@@commentDeleted:Comment deleted`);
          this.loadComments(project.id);
        },
        error: (err) => {
          this.notificationService.error($localize`:@@commentDeleteFailed:Failed to delete comment`);
          console.error('Error deleting comment:', err);
        },
      });
  }

  getTechIcon(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.logo;
  }

  getTechDocUrl(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.docUrl;
  }
}
