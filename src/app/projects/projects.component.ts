import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Project, Rating } from '../interfaces/project.interface';
import { ProjectDataService } from '../services/project-data.service';
import { ProjectDetailComponent } from '../project-detail/project-detail.component';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
})
export class ProjectsComponent implements OnInit {
  // Angular 20 function-based injection
  private projectService = inject(ProjectDataService);
  private auth = inject(AuthService);
  private notifier = inject(NotificationService);

  // Local component state using signals
  private isLoadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Computed properties from service
  public readonly projects = this.projectService.filteredProjects;
  public readonly uniqueTechnologies = this.projectService.uniqueTechnologies;
  public readonly filters = this.projectService.filters;
  public readonly isLoading = this.isLoadingSignal.asReadonly();
  public readonly error = this.errorSignal;
  public readonly isAdmin = this.auth.isAdmin;

  // Form controls
  public searchTerm = signal('');
  public selectedTechnology = signal('');
  public minRating = signal(0);
  public showFeaturedOnly = signal(false);

  constructor() {
    // Setup reactive filter updates
    effect(() => {
      this.projectService.updateFilters({
        searchTerm: this.searchTerm(),
        technology: this.selectedTechnology(),
        minRating: this.minRating(),
        featured: this.showFeaturedOnly(),
      });
    });
  }

  ngOnInit(): void {
    // Component initialization logic
    this.initializeComponent();
  }

  private initializeComponent(): void {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    // Simulate loading time (in real app, this might be an HTTP call)
    setTimeout(() => {
      this.isLoadingSignal.set(false);
    }, 500);
  }

  // User interaction methods

  toggleDetails(project: Project): void {
    this.projectService.toggleProjectExpanded(project.id);
  }

  addRating(project: Project, rating: number): void {
    const success = this.projectService.addRating(project.id, rating);
    if (!success) {
      this.showError(
        'Unable to add rating. You may have already rated this project.'
      );
    }
  }

  canRate(project: Project): boolean {
    return this.projectService.canRateProject(project.id);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedTechnology.set('');
    this.minRating.set(0);
    this.showFeaturedOnly.set(false);
    this.projectService.resetFilters();
  }

  resetProjectRatings(project: Project): void {
    if (!this.isAdmin()) {
      this.notifier.error('Only admins can reset ratings.');
      return;
    }

    if (confirm(`Are you sure you want to reset all ratings for "${project.name}"?`)) {
      this.projectService.resetProjectRatings(project.id);
      this.notifier.success('Ratings reset.');
    }
  }

  private showError(message: string): void {
    this.errorSignal.set(message);
    setTimeout(() => this.errorSignal.set(null), 5000);
  }

  // Utility methods

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getRatingClass(star: number, averageRating: number): string {
    if (averageRating >= star) return 'star-filled';
    if (averageRating >= star - 0.5) return 'star-half';
    return 'star-empty';
  }

  getRatings(ratings: Rating[], rating: number): Rating[] {
    return ratings.filter((r) => r.rating === rating);
  }
}
