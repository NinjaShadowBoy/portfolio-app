import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, filter, tap } from 'rxjs/operators';
import {
  Project,
  ProjectFilters,
  Rating,
} from '../interfaces/project.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectDataService {
  private readonly STORAGE_KEY = 'portfolio-projects';
  private readonly USER_RATINGS_KEY = 'user-ratings';

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/projects`;

  // Angular 20 Signals for reactive state management
  private projectsSignal = signal<Project[]>([]);
  private filtersSignal = signal<ProjectFilters>({
    searchTerm: '',
    technology: '',
    minRating: 0,
    featured: false,
  });

  // Computed signals for derived state
  public readonly projects = this.projectsSignal.asReadonly();
  public readonly filters = this.filtersSignal.asReadonly();
  public readonly filteredProjects = computed(() => this.applyFilters());
  public readonly uniqueTechnologies = computed(() =>
    this.getUniqueTechnologies()
  );
  public readonly featuredProjects = computed(() =>
    this.projects().filter((p) => p.featured)
  );

  // Traditional observables for bacward compatibility
  // private projectsSubject = new BehaviorSubject<Project[]>([]);
  // public projects$ = this.projectsSubject.asObservable();

  // User's rated project tracking
  private ratedProjects = new Set<string>();

  constructor() {
    this.loadInitialData();
    this.setupAutoSave();
  }

  private loadInitialData(): void {
    const savedProjects = this.loadFromStorage();
    const projects =
      savedProjects.length > 0 ? savedProjects : this.getDefaultProjects();

    this.projectsSignal.set(projects);
    // this.projectsSubject.next(projects);
    this.loadUserRatings();

    let headers = new HttpHeaders().set('Access-Control-Allow-Origin', 'true');
    this.http.get<Project[]>(this.apiUrl, { headers }).subscribe({
      next: (posts) => {
        this.projectsSignal.set(posts);
      },
      error: (err) =>
        console.error('Error loading projects from server: ', err),
    });
  }

  private setupAutoSave(): void {
    // Use Angular 20's effect for automatic persistence
    effect(() => {
      const projects = this.projects();
      this.saveToStorage(projects);
    });
  }

  private getDefaultProjects(): Project[] {
    return [
      {
        id: 'hotel-reservation',
        name: 'Hotel Reservation System',
        description:
          'Full-stack Spring Boot application with integrated payment processing via Stripe API.',
        technologies: [
          'Spring Boot',
          'Java',
          'Stripe API',
          'MySQL',
          'Thymeleaf',
        ],
        githubLink: 'https://github.com/example/hotel-reservation',
        challenges:
          'Handling concurrent bookings and ensuring data consistency across multiple services.',
        whatILearned:
          'Advanced Spring Boot patterns, payment gateway integration, and microservices architecture.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date('2023-08-15'),
        featured: true,
        photosUrls: [],
      },
      {
        id: 'pacman-clone',
        name: 'Pac-Man Clone',
        description:
          'Game using SDL with procedural maze generation and custom AI for ghosts.',
        technologies: ['C', 'SDL', 'Game Development', 'AI Algorithms'],
        githubLink: 'https://github.com/example/pacman-clone',
        challenges:
          'Implementing smooth game physics, AI pathfinding, and real-time collision detection.',
        whatILearned:
          'Game development patterns, AI algorithms, and performance optimization in C.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2023-03-15'),
        updatedAt: new Date('2023-05-20'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'construction-tracking',
        name: 'Construction Material Tracking System',
        description:
          'Enterprise app for managing construction site inventory with real-time updates.',
        technologies: [
          'Spring Boot',
          'Java',
          'MySQL',
          'JavaScript',
          'WebSocket',
        ],
        githubLink: 'https://github.com/example/construction-tracking',
        challenges:
          'Managing complex inventory relationships, real-time updates, and multi-user concurrent access.',
        whatILearned:
          'Enterprise architecture, WebSocket implementation, and complex data synchronization.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2023-09-01'),
        updatedAt: new Date('2023-11-30'),
        featured: true,
        photosUrls: [],
      },
    ];
  }

  // Public API Methods

  /**
   * Add a new project to the collection
   */
  addProject(
    projectData: Omit<
      Project,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'isExpanded'
      | 'ratings'
      | 'averageRating'
      | 'photosUrls'
    >
  ): void {
    const newProject: Project = {
      ...projectData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isExpanded: false,
      ratings: [],
      averageRating: 0,
      photosUrls: [],
    };

    const updatedProjects = [...this.projects(), newProject];
    this.projectsSignal.set(updatedProjects);
    // this.projectsSubject.next(updatedProjects);
  }

  /**
   * Update existing project
   */
  updateProject(projectId: string, updates: Partial<Project>): boolean {
    const projects = this.projects();
    const index = projects.findIndex((p) => p.id === projectId);

    if (index === -1) return false;

    const updatedProject: Project = {
      ...projects[index],
      ...updates,
      updatedAt: new Date(),
    };

    const updatedProjects = [...projects];
    updatedProjects[index] = updatedProject;

    this.projectsSignal.set(updatedProjects);
    // this.projectsSubject.next(updatedProjects);

    return true;
  }

  /**
   * Delete a project by Id
   */
  deleteProject(projectId: string): boolean {
    const projects = this.projects();
    const filteredProjects = projects.filter((p) => p.id !== projectId);

    if (filteredProjects.length === projects.length) return false;

    this.projectsSignal.set(filteredProjects);
    // this.projectsSubject.next(filteredProjects);
    return true;
  }

  /**
   * Get a project by ID
   */
  getProject(projectId: string): Project | undefined {
    return this.projects().find((p) => p.id === projectId);
  }

  /**
   * Toggle project expanded state
   */
  toggleProjectExpanded(projectId: string): void {
    const project = this.getProject(projectId);
    project ? (project.isExpanded = !project.isExpanded) : {};
  }

  /**
   * Add rating to a project
   */
  addRating(projectId: string, rating: number, comment?: string): boolean {
    const userId = this.getCurrentUserId();
    const ratingKey = `${projectId}-${userId}`;

    // Check if user has already rated this project
    if (this.ratedProjects.has(ratingKey)) {
      return false;
    }

    const project = this.getProject(projectId);
    if (!project || rating < 1 || rating > 5) {
      return false;
    }

    const newRating: Rating = {
      id: this.generateId(),
      userId,
      rating,
      comment,
      createdAt: new Date(),
    };

    const updatedRatings = [...project.ratings, newRating];
    const averageRating =
      updatedRatings.reduce((sum, r) => sum + rating, 0) /
      updatedRatings.length;

    this.updateProject(projectId, {
      ratings: updatedRatings,
      averageRating: Math.round(averageRating * 10) / 10,
    });

    this.ratedProjects.add(ratingKey);
    this.saveUserRatings();
    return true;
  }

  /**
   * Check if user can rate a project
   */
  canRateProject(projectId: string): boolean {
    const userId = this.getCurrentUserId();
    const ratingKey = `${projectId}-${userId}`;
    return !this.ratedProjects.has(ratingKey);
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
   * Reset all ratings for a project (admin function)
   */
  resetProjectRatings(projectId: string): boolean {
    this.ratedProjects = new Set(
      [...this.ratedProjects].filter((rp) => !rp.includes(`${projectId}`))
    );
    return this.updateProject(projectId, {
      ratings: [],
      averageRating: 0,
    });
  }

  // Private helper methods

  private applyFilters(): Project[] {
    const projects = this.projects();
    const filters = this.filters();

    return projects.filter((project) => {
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
  }

  private getUniqueTechnologies(): string[] {
    const allTechs = this.projects().flatMap((project) => project.technologies);
    return [...new Set(allTechs)].sort();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private getCurrentUserId(): string {
    // In a real app, this would come from authentication service
    return 'user-' + (localStorage.getItem('user-id') || 'anonymous');
  }

  private loadFromStorage(): Project[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load projects from storage:', error);
      return [];
    }
  }

  private saveToStorage(projects: Project[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects to storage:', error);
    }
  }

  private loadUserRatings(): void {
    try {
      const saved = localStorage.getItem(this.USER_RATINGS_KEY);
      if (saved) {
        this.ratedProjects = new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load user ratings:', error);
    }
  }

  private saveUserRatings(): void {
    try {
      localStorage.setItem(
        this.USER_RATINGS_KEY,
        JSON.stringify([...this.ratedProjects])
      );
    } catch (error) {
      console.error('Failed to save user ratings:', error);
    }
  }
}
