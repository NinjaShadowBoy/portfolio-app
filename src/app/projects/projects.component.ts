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
  public readonly totalProjects = this.projectService.projects; // Total unfiltered count
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

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedTechnology.set('');
    this.minRating.set(0);
    this.showFeaturedOnly.set(false);
    this.projectService.resetFilters();
  }
}
