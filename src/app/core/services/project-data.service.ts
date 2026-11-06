import { Injectable, signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, of, tap, map, delay, catchError } from 'rxjs';
import {
  Project,
  ProjectFilters,
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from '../interfaces/project.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const DEFAULT_FILTERS: ProjectFilters = { searchTerm: '', technologies: [], featured: false };

/** Shown when the API is unreachable or returns no projects. */
const FALLBACK_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Lora',
    description:
      'A mobile learning companion built with Expo to stream audio lessons and keep learning sessions organized.',
    technologies: ['Expo React Native', 'TypeScript', 'JavaScript'],
    githubLink: 'https://github.com/',
    demoLink: null,
    challenges:
      'Balancing audio playback reliability with smooth navigation across mobile devices.',
    whatILearned:
      'How to structure a mobile app around asynchronous media and reusable state.',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: true,
    displayOrder: 0,
    photoUrls: ['http://localhost:4200/assets/images/2223i141.jpg'],
    isExpanded: false,
  },
  {
    id: 3,
    name: 'Connect Four',
    description:
      'A visually rich strategy game with polished interactions and animated game feedback.',
    technologies: ['TypeScript', 'Angular', 'CSS3'],
    githubLink: 'https://github.com/',
    demoLink: null,
    challenges:
      'Making the board logic feel responsive without losing the visual weight of the animations.',
    whatILearned:
      'How small interaction details can make a simple game feel much more alive.',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: false,
    displayOrder: 1,
    photoUrls: [],
    isExpanded: false,
  },
];

/** Projects sorted by their position in `ids`, with `displayOrder` set to that position. Unlisted projects go last. */
function applyOrder(projects: Project[], ids: number[]): Project[] {
  const position = (project: Project) => {
    const index = ids.indexOf(project.id);
    return index === -1 ? ids.length : index;
  };
  return projects
    .map((project) => ({ ...project, displayOrder: position(project) }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

@Injectable({ providedIn: 'root' })
export class ProjectDataService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/projects`;

  private projectsResource = rxResource({
    stream: () =>
      this.http.get<Project[]>(this.apiUrl).pipe(
        map((projects) => projects.map((p) => ({ ...p, isExpanded: p.isExpanded ?? false }))),
        map((projects) => (projects.length > 0 ? projects : this.fallbackProjects())),
        catchError(() => of(this.fallbackProjects())),
        delay(300) // Keep the loading spinner visible long enough to avoid flicker.
      ),
  });

  private filtersSignal = signal<ProjectFilters>(DEFAULT_FILTERS);

  readonly projects = computed(() => this.projectsResource.value() ?? []);
  readonly isLoading = this.projectsResource.isLoading;
  readonly filters = this.filtersSignal.asReadonly();
  readonly filteredProjects = computed(() => this.applyFilters());
  readonly uniqueTechnologies = computed(() =>
    [...new Set(this.projects().flatMap((project) => project.technologies))].sort()
  );
  readonly featuredProjects = computed(() => this.projects().filter((p) => p.featured));

  refreshProjects() {
    this.projectsResource.reload();
  }

  /** Admin only. */
  createProject(projectData: ProjectCreateRequest): Observable<Project> {
    return this.http
      .post<Project>(this.apiUrl, this.projectPayload(projectData))
      .pipe(tap(() => this.refreshProjects()));
  }

  /** Admin only. */
  updateProject(projectId: number, projectData: ProjectUpdateRequest): Observable<Project> {
    return this.http
      .put<Project>(`${this.apiUrl}/${projectId}`, this.projectPayload(projectData))
      .pipe(tap(() => this.refreshProjects()));
  }

  /** Admin only. */
  deleteProject(projectId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${projectId}`)
      .pipe(tap(() => this.refreshProjects()));
  }

  /**
   * Admin only. `ids` lists every project id in the desired order. The list
   * shows the new order at once, then reloads to pick up the stored positions.
   */
  reorderProjects(ids: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/order`, { ids }).pipe(
      tap(() => {
        this.projectsResource.update((projects) => applyOrder(projects ?? [], ids));
        this.refreshProjects();
      })
    );
  }

  getProject(projectId: number | string): Project | undefined {
    return this.projects().find((p) => p.id === Number(projectId));
  }

  /** UI-only expanded state. */
  toggleProjectExpanded(projectId: number): void {
    this.projectsResource.update((projects) =>
      (projects ?? []).map((p) => (p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p))
    );
  }

  updateFilters(filters: Partial<ProjectFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...filters }));
  }

  resetFilters(): void {
    this.filtersSignal.set(DEFAULT_FILTERS);
  }

  /** Imports may carry ids, ratings, photos or UI state; the API accepts only writable fields. */
  private projectPayload(data: ProjectUpdateRequest): ProjectUpdateRequest {
    const { name, description, technologies, githubLink, demoLink, challenges, whatILearned, featured } = data;
    return { name, description, technologies, githubLink, demoLink, challenges, whatILearned, featured };
  }

  private applyFilters(): Project[] {
    const { searchTerm, technologies, featured } = this.filters();
    const term = searchTerm.trim().toLowerCase();

    return this.projects().filter(
      (project) =>
        (project.name.toLowerCase().includes(term) ||
          project.description.toLowerCase().includes(term) ||
          project.technologies.some((tech) => tech.toLowerCase().includes(term))) &&
        (technologies.length === 0 || technologies.some((tech) => project.technologies.includes(tech))) &&
        (!featured || project.featured)
    );
  }

  private fallbackProjects(): Project[] {
    return FALLBACK_PROJECTS.map((project) => ({ ...project }));
  }
}
