import { Component, inject } from '@angular/core';
import { ProjectDataService } from '../../core/services/project-data.service';
import { ProjectFilters } from '../../core/interfaces/project.interface';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';

/** Filterable projects list. Filter state lives in {@link ProjectDataService}. */
@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ProjectCardComponent],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
})
export class ProjectsComponent {
  private projectService = inject(ProjectDataService);

  readonly projects = this.projectService.filteredProjects;
  readonly totalProjects = this.projectService.projects;
  readonly uniqueTechnologies = this.projectService.uniqueTechnologies;
  readonly filters = this.projectService.filters;
  readonly isLoading = this.projectService.isLoading;

  updateFilters(filters: Partial<ProjectFilters>): void {
    this.projectService.updateFilters(filters);
  }

  resetFilters(): void {
    this.projectService.resetFilters();
  }
}
