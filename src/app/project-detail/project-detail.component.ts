import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProjectDataService } from '../services/project-data.service';
import { RatingService, RatingDto } from '../services/rating.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { Project } from '../interfaces/project.interface';
import { environment } from '../../environments/environment';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, UserAvatarComponent],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);
  private ratingService = inject(RatingService);
  authService = inject(AuthService); // Make public for template access
  private notificationService = inject(NotificationService);

  project: Project | undefined;
  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  // Rating & Comment state
  ratings: RatingDto[] = [];
  averageRating: number = 0;
  ratingCount: number = 0;
  userRating: RatingDto | null = null;
  hoveredStar: number = 0;
  selectedRating: number = 0;
  commentText: string = '';
  isEditingRating: boolean = false;
  isAuthenticated: boolean = false;
  isSubmitting: boolean = false;

  constructor() {
    this.route.params.subscribe((params) => {
      this.project = this.projectService.getProject(params['id']);
      if (this.project) {
        this.loadRatings();
      }
    });
  }

  ngOnInit() {
    // isAuthenticated is a computed signal, access it directly
  }

  loadRatings() {
    if (!this.project) return;

    this.ratingService.getRatingsByProject(this.project.id).subscribe({
      next: (ratings) => {
        this.ratings = ratings;
        this.findUserRating();
      },
      error: (err) => console.error('Error loading ratings:', err),
    });

    this.ratingService.getAverageRating(this.project.id).subscribe({
      next: (result) => (this.averageRating = result.averageRating),
      error: (err) => console.error('Error loading average rating:', err),
    });

    this.ratingService.getRatingCount(this.project.id).subscribe({
      next: (result) => (this.ratingCount = result.count),
      error: (err) => console.error('Error loading rating count:', err),
    });
  }

  findUserRating() {
    const user = this.authService.user();
    if (!user) return;

    this.userRating = this.ratings.find((r) => r.userId === user.id) || null;

    if (this.userRating) {
      this.selectedRating = this.userRating.rating;
      this.commentText = this.userRating.comment || '';
    }
  }

  onStarHover(star: number) {
    this.hoveredStar = star;
  }

  onStarLeave() {
    this.hoveredStar = 0;
  }

  onStarClick(star: number) {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Please log in to rate this project');
      return;
    }
    this.selectedRating = star;
  }

  submitRating() {
    if (!this.authService.isAuthenticated() || !this.project || this.isSubmitting) return;

    if (this.selectedRating === 0) {
      this.notificationService.warning('Please select a rating');
      return;
    }

    this.isSubmitting = true;

    const ratingData = {
      rating: this.selectedRating,
      comment: this.commentText?.trim() || undefined,
    };

    if (this.userRating) {
      // Update existing rating
      this.ratingService
        .updateRating(this.userRating.id, ratingData)
        .subscribe({
          next: (updated) => {
            this.notificationService.success('Rating updated successfully');
            this.loadRatings();
            this.isEditingRating = false;
            this.isSubmitting = false;
          },
          error: (err) => {
            this.notificationService.error('Failed to update rating');
            console.error('Error updating rating:', err);
            this.isSubmitting = false;
          },
        });
    } else {
      // Create new rating
      this.ratingService
        .createRating({
          projectId: this.project.id,
          ...ratingData,
        })
        .subscribe({
          next: (created) => {
            this.notificationService.success('Rating submitted successfully');
            this.loadRatings();
            this.isSubmitting = false;
          },
          error: (err) => {
            this.notificationService.error('Failed to submit rating');
            console.error('Error creating rating:', err);
            this.isSubmitting = false;
          },
        });
    }
  }

  startEditingRating() {
    this.isEditingRating = true;
  }

  cancelEditingRating() {
    this.isEditingRating = false;
    if (this.userRating) {
      this.selectedRating = this.userRating.rating;
      this.commentText = this.userRating.comment || '';
    }
  }

  deleteRating() {
    if (!this.userRating) return;

    if (!confirm('Are you sure you want to delete your rating?')) return;

    this.ratingService.deleteRating(this.userRating.id).subscribe({
      next: () => {
        this.notificationService.success('Rating deleted successfully');
        this.selectedRating = 0;
        this.commentText = '';
        this.loadRatings();
      },
      error: (err) => {
        this.notificationService.error('Failed to delete rating');
        console.error('Error deleting rating:', err);
      },
    });
  }

  getPhotoUrl(photoUrl: string): string {
    return this.apiBaseUrl + photoUrl;
  }

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  isStarFilled(star: number): boolean {
    const displayRating = this.hoveredStar || this.selectedRating;
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
}
