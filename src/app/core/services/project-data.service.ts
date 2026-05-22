import { Injectable, signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { tap, map, delay } from 'rxjs/operators';
import {
  Project,
  ProjectFilters,
} from '../interfaces/project.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RatingService, RatingDto } from './rating.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectDataService {
  private http = inject(HttpClient);
  private ratingService = inject(RatingService);
  private apiUrl = `${environment.apiBaseUrl}/projects`;

  // Angular 20 rxResource for declarative async data fetching
  private projectsResource = rxResource({
    loader: () => this.http.get<Project[]>(this.apiUrl).pipe(
      map(projects => projects.map(p => ({ ...p, isExpanded: false }))),
      delay(300) // Ensure loading spinner shows for at least 300ms to avoid flicker
    )
  });

  private filtersSignal = signal<ProjectFilters>({
    searchTerm: '',
    technology: '',
    minRating: 0,
    featured: false,
  });

  // Computed signals for derived state
  public readonly projects = computed(() => this.projectsResource.value() ?? []);
  public readonly isLoading = this.projectsResource.isLoading;
  public readonly filters = this.filtersSignal.asReadonly();
  public readonly filteredProjects = computed(() => this.applyFilters());
  public readonly uniqueTechnologies = computed(() =>
    this.getUniqueTechnologies()
  );
  public readonly featuredProjects = computed(() =>
    this.projects().filter((p) => p.featured)
  );

  constructor() {
    // Initial data is automatically loaded by rxResource!
  }

  // Refreshes the projects manually
  refreshProjects() {
    this.projectsResource.reload();
  }

  // Public API Methods

  /**
   * Create a new project via HTTP (admin only)
   */
  createProject(projectData: {
    name: string;
    description: string;
    technologies: string[];
    githubLink: string;
    challenges: string;
    whatILearned: string;
    featured?: boolean;
  }): Observable<Project> {
    return this.http
      .post<Project>(this.apiUrl, projectData)
      .pipe(
        tap(() => {
          // Refresh projects after successful creation
          this.refreshProjects();
        })
      );
  }

  /**
   * Update a project via HTTP (admin only)
   */
  updateProject(
    projectId: number,
    projectData: {
      name?: string;
      description?: string;
      technologies?: string[];
      githubLink?: string;
      challenges?: string;
      whatILearned?: string;
      featured?: boolean;
    }
  ): Observable<Project> {
    return this.http
      .put<Project>(`${this.apiUrl}/${projectId}`, projectData)
      .pipe(
        tap(() => {
          // Refresh projects after successful update
          this.refreshProjects();
        })
      );
  }

  /**
   * Delete a project via HTTP (admin only)
   */
  deleteProject(projectId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${projectId}`)
      .pipe(
        tap(() => {
          // Refresh projects after successful deletion
          this.refreshProjects();
        })
      );
  }

  /**
   * Get a project by ID
   */
  getProject(projectId: number): Project | undefined {
    return this.projects().find((p) => p.id === Number(projectId));
  }

  /**
   * Toggle project expanded state (UI only)
   */
  toggleProjectExpanded(projectId: number): void {
    this.projectsResource.update((projects) => {
      const current = projects ?? [];
      return current.map((p) =>
        p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
      );
    });
  }

  /**
   * Add rating to a project (delegates to RatingService)
   */
  addRating(projectId: number, rating: number, comment?: string): Observable<RatingDto> {
    return this.ratingService.createRating({
      projectId,
      rating,
      comment,
    }).pipe(
      tap(() => {
        // Refresh projects to get updated rating statistics
        this.refreshProjects();
      })
    );
  }

  /**
   * Check if user can rate a project (delegates to RatingService)
   */
  canRateProject(projectId: number): Observable<boolean> {
    return this.ratingService.hasUserRatedProject(projectId).pipe(
      map((result) => !result.hasRated)
    );
  }

  /**
   * Get ratings for a project (delegates to RatingService)
   */
  getProjectRatings(projectId: number): Observable<RatingDto[]> {
    return this.ratingService.getRatingsByProject(projectId);
  }

  /**
   * Update a rating (delegates to RatingService)
   */
  updateRating(ratingId: number, rating: number, comment?: string): Observable<RatingDto> {
    return this.ratingService.updateRating(ratingId, { rating, comment }).pipe(
      tap(() => {
        // Refresh projects to get updated rating statistics
        this.refreshProjects();
      })
    );
  }

  /**
   * Delete a rating (delegates to RatingService)
   */
  deleteRating(ratingId: number): Observable<void> {
    return this.ratingService.deleteRating(ratingId).pipe(
      tap(() => {
        // Refresh projects to get updated rating statistics
        this.refreshProjects();
      })
    );
  }

  /**
   * Update filters
   */
  updateFilters(filters: Partial<ProjectFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...filters }));
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.filtersSignal.set({
      searchTerm: '',
      technology: '',
      minRating: 0,
      featured: false,
    });
  }

  /**
   * Reset all ratings for a project (admin function, delegates to RatingService)
   */
  resetProjectRatings(projectId: number): Observable<void> {
    return this.ratingService.resetProjectRatings(projectId).pipe(
      tap(() => {
        // Refresh projects to get updated rating statistics
        this.refreshProjects();
      })
    );
  }

  // Private helper methods

  private applyFilters(): Project[] {
    const projects = this.projects();
    const filters = this.filters();

    const result = projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        project.description
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase());

      const matchesTechnology =
        !filters.technology ||
        project.technologies.includes(filters.technology);

      const matchesRating = project.averageRating >= filters.minRating;

      const matchesFeatured = !filters.featured || project.featured;

      return (
        matchesSearch && matchesTechnology && matchesRating && matchesFeatured
      );
    });
    return result;
  }

  private getUniqueTechnologies(): string[] {
    const allTechs = this.projects().flatMap((project) => project.technologies);
    return [...new Set(allTechs)].sort();
  }
}
