import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Project } from '../interfaces/project.interface';
import { ProjectDataService } from '../services/project-data.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ProjectCardComponent } from '../project-card/project-card.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectCardComponent],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
})
export class ProjectsComponent {
  // Angular function-based injection
  private projectService = inject(ProjectDataService);
  private auth = inject(AuthService);
  private notifier = inject(NotificationService);

  // Computed properties from service
  public readonly projects = this.projectService.filteredProjects;
  public readonly uniqueTechnologies = this.projectService.uniqueTechnologies;
  public readonly filters = this.projectService.filters;
  public readonly isLoading = this.projectService.isLoading;
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

  // User interaction methods

  toggleDetails(project: Project): void {
    this.projectService.toggleProjectExpanded(project.id);
  }

  addRating(project: Project, rating: number): void {
    this.projectService.addRating(project.id, rating).subscribe({
      next: () => {
        this.notifier.success('Rating added successfully!');
      },
      error: (err) => {
        console.error('Error adding rating:', err);
        this.notifier.error(
          'Unable to add rating. You may have already rated this project or need to be logged in.'
        );
      },
    });
  }

  canRate(project: Project): boolean {
    // For synchronous UI checks, we'll assume they can rate and handle errors server-side
    // Alternatively, you can track this in component state with an async call
    return true;
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
      this.projectService.resetProjectRatings(project.id).subscribe({
        next: () => {
          this.notifier.success('Ratings reset successfully.');
        },
        error: (err) => {
          console.error('Error resetting ratings:', err);
          this.notifier.error('Failed to reset ratings.');
        },
      });
    }
  }
}
