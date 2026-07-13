
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs/operators';
import { ProjectDataService } from '../../core/services/project-data.service';
import { RatingDto } from '../../core/services/rating.service';
import { AuthService } from '../../core/services/auth.service';
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
  authService = inject(AuthService); // Make public for template access
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

  // Rating & Comment state
  ratings = signal<RatingDto[]>([]);
  averageRating = signal(0);
  ratingCount = signal(0);
  userRating = signal<RatingDto | null>(null);
  hoveredStar = signal(0);
  selectedRating = signal(0);
  commentText = signal('');
  isEditingRating = signal(false);
  isSubmitting = signal(false);

  readonly stars = [1, 2, 3, 4, 5];

  private readonly projectEffect = effect(() => {
    const project = this.project();
    if (!project) {
      this.resetRatingState();
      return;
    }

    this.averageRating.set(project.averageRating);
    this.ratingCount.set(project.totalRatings);
    this.loadRatings(project.id);
  });

  private resetRatingState() {
    this.ratings.set([]);
    this.userRating.set(null);
    this.selectedRating.set(0);
    this.hoveredStar.set(0);
    this.commentText.set('');
    this.isEditingRating.set(false);
    this.averageRating.set(0);
    this.ratingCount.set(0);
  }

  private loadRatings(projectId: number) {
    this.projectService.getProjectRatings(projectId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (ratings) => {
        this.ratings.set(ratings);
        this.findUserRating();
      },
      error: (err) => console.error('Error loading ratings:', err),
    });
  }

  private findUserRating() {
    const user = this.authService.user();
    if (!user) {
      this.userRating.set(null);
      this.selectedRating.set(0);
      this.commentText.set('');
      return;
    }

    const rating = this.ratings().find((r) => r.userId === user.id) || null;
    this.userRating.set(rating);

    if (rating) {
      this.selectedRating.set(rating.rating);
      this.commentText.set(rating.comment || '');
    } else {
      this.selectedRating.set(0);
      this.commentText.set('');
    }
  }

  onStarHover(star: number) {
    this.hoveredStar.set(star);
  }

  onStarLeave() {
    this.hoveredStar.set(0);
  }

  onStarClick(star: number) {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning($localize`:@@ratingLoginRequired:Please log in to rate this project`);
      return;
    }
    this.selectedRating.set(star);
  }

  submitRating() {
    const project = this.project();
    if (!this.authService.isAuthenticated() || !project || this.isSubmitting()) return;

    if (this.selectedRating() === 0) {
      this.notificationService.warning($localize`:@@ratingSelectRequired:Please select a rating`);
      return;
    }

    this.isSubmitting.set(true);

    const ratingData = {
      rating: this.selectedRating(),
      comment: this.commentText().trim() || undefined,
    };

    const request$ = this.userRating()
      ? this.projectService.updateRating(
          this.userRating()!.id,
          ratingData.rating,
          ratingData.comment
        )
      : this.projectService.addRating(
          project.id,
          ratingData.rating,
          ratingData.comment
        );

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: () => {
          this.notificationService.success(
            this.userRating() ? $localize`:@@ratingUpdated:Rating updated successfully` : $localize`:@@ratingSubmitted:Rating submitted successfully`
          );
          this.loadRatings(project.id);
          this.isEditingRating.set(false);
        },
        error: (err) => {
          this.notificationService.error(
            this.userRating() ? $localize`:@@ratingUpdateFailed:Failed to update rating` : $localize`:@@ratingSubmitFailed:Failed to submit rating`
          );
          console.error('Error saving rating:', err);
        },
      });
  }

  startEditingRating() {
    this.isEditingRating.set(true);
  }

  cancelEditingRating() {
    this.isEditingRating.set(false);
    const rating = this.userRating();
    if (rating) {
      this.selectedRating.set(rating.rating);
      this.commentText.set(rating.comment || '');
    }
  }

  deleteRating() {
    const rating = this.userRating();
    if (!rating) return;

    if (!confirm($localize`:@@ratingDeleteConfirm:Are you sure you want to delete your rating?`)) return;

    this.projectService.deleteRating(rating.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.notificationService.success($localize`:@@ratingDeleted:Rating deleted successfully`);
        this.selectedRating.set(0);
        this.commentText.set('');
        const project = this.project();
        if (project) {
          this.loadRatings(project.id);
        }
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

  /**
   * Get user name from user ID for display in ratings
   * For now, returns "User" as a placeholder until backend provides user info
   */
  getUserName(userId: number): string {
    // TODO: Fetch actual user name from backend when available
    // For now, check if it's the current user
    const currentUser = this.authService.user();
    if (currentUser && currentUser.id === userId) {
      return currentUser.name;
    }
    return `User ${userId}`;
  }

  getTechIcon(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.logo;
  }

  getTechDocUrl(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.docUrl;
  }
}
