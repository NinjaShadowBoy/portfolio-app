import { Component, computed, inject, signal } from '@angular/core';
import { ProjectDataService } from '../../core/services/project-data.service';
import { ProjectFilters } from '../../core/interfaces/project.interface';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';

/** Technologies shown before "More" on wide screens; phones scroll the full row. */
const VISIBLE_TECH = 10;

/** Filterable projects list. Filter state lives in {@link ProjectDataService}. */
@Component({
  selector: 'app-projects',
  imports: [ProjectCardComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent {
  private projectService = inject(ProjectDataService);

  readonly projects = this.projectService.filteredProjects;
  readonly totalProjects = this.projectService.projects;
  readonly filters = this.projectService.filters;
  readonly isLoading = this.projectService.isLoading;

  readonly showAllTech = signal(false);

  /** Every technology with its project count, most used first. */
  readonly techOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const project of this.totalProjects()) {
      for (const tech of project.technologies) counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
    const selected = this.filters().technology;
    return [...counts]
      .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
      .map(([name, count], index) => ({ name, count, extra: index >= VISIBLE_TECH && name !== selected }));
  });

  readonly hiddenTechCount = computed(() => this.techOptions().filter((t) => t.extra).length);

  readonly hasActiveFilters = computed(() => {
    const { searchTerm, technology, featured } = this.filters();
    return searchTerm.trim() !== '' || technology !== '' || featured;
  });

  readonly resultLabel = computed(() => {
    const shown = this.projects().length;
    const total = this.totalProjects().length;
    if (this.hasActiveFilters()) {
      return $localize`:@@projectsResultFiltered:Showing ${shown}:shown: of ${total}:total:`;
    }
    return total === 1
      ? $localize`:@@projectsResultOne:1 project`
      : $localize`:@@projectsResultAll:${total}:total: projects`;
  });

  updateFilters(filters: Partial<ProjectFilters>): void {
    this.projectService.updateFilters(filters);
  }

  toggleTech(name: string): void {
    this.updateFilters({ technology: this.filters().technology === name ? '' : name });
  }

  resetFilters(): void {
    this.projectService.resetFilters();
  }
}
