import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ProjectDataService } from '../../core/services/project-data.service';
import { ProjectFilters } from '../../core/interfaces/project.interface';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';
import { TECH_CATEGORIES, TechCategory, TechnologiesService } from '../../core/services/technologies.service';

/** Technologies shown before "More", the most used first; selected ones always show. */
const VISIBLE_TECH = 10;

const CATEGORY_LABELS: Record<TechCategory, string> = {
  languages: $localize`:Projects tech group languages@@projectsTechGroupLanguages:Languages`,
  frontend: $localize`:Projects tech group frontend@@projectsTechGroupFrontend:Frontend & mobile`,
  backend: $localize`:Projects tech group backend@@projectsTechGroupBackend:Backend`,
  data: $localize`:Projects tech group data and AI@@projectsTechGroupData:Data & AI`,
  infra: $localize`:Projects tech group infrastructure@@projectsTechGroupInfra:Infrastructure`,
  services: $localize`:Projects tech group services@@projectsTechGroupServices:Services`,
  other: $localize`:Projects tech group other@@projectsTechGroupOther:Other`,
};

/** Filterable projects list. Filter state lives in {@link ProjectDataService}. */
@Component({
  selector: 'app-projects',
  imports: [ProjectCardComponent, NgTemplateOutlet],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent {
  private projectService = inject(ProjectDataService);
  private techService = inject(TechnologiesService);

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
    const selected = new Set(this.filters().technologies);
    return [...counts]
      .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
      .map(([name, count], index) => ({
        name,
        count,
        logo: this.techService.getTechnology(name)?.logo,
        selected: selected.has(name),
        extra: index >= VISIBLE_TECH && !selected.has(name),
      }));
  });

  readonly visibleTech = computed(() => this.techOptions().filter((t) => !t.extra));
  readonly hiddenTechCount = computed(() => this.techOptions().length - this.visibleTech().length);

  /** The expanded list: every technology under its group, groups in a fixed order, empty ones dropped. */
  readonly techGroups = computed(() => {
    const options = this.techOptions();
    const byCategory = new Map<TechCategory, typeof options>();
    for (const tech of options) {
      const category = this.techService.getCategory(tech.name);
      byCategory.set(category, [...(byCategory.get(category) ?? []), tech]);
    }
    return [...TECH_CATEGORIES, 'other' as const]
      .filter((category) => byCategory.has(category))
      .map((category) => ({ category, label: CATEGORY_LABELS[category], techs: byCategory.get(category)! }));
  });

  readonly hasActiveFilters = computed(() => {
    const { searchTerm, technologies, featured } = this.filters();
    return searchTerm.trim() !== '' || technologies.length > 0 || featured;
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

  /** Chips are independent toggles: any number can be on at once. */
  toggleTech(name: string): void {
    const current = this.filters().technologies;
    this.updateFilters({
      technologies: current.includes(name) ? current.filter((t) => t !== name) : [...current, name],
    });
  }

  /** Logos that fail to load fall back to the plain chip. */
  readonly failedLogos = signal<ReadonlySet<string>>(new Set());

  markLogoFailed(name: string): void {
    this.failedLogos.update((set) => new Set(set).add(name));
  }

  resetFilters(): void {
    this.projectService.resetFilters();
  }
}
