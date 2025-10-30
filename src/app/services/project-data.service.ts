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
        id: 'mapiole-webapp',
        name: 'Mapiole WebApp',
        description: 'A web app developed to be used by eyang students.',
        technologies: ['Java', 'HTML', 'CSS', 'Web application'],
        githubLink: 'https://github.com/sims-yann/MapioleWebApp',
        challenges:
          'Integrating the Java backend with a responsive HTML/CSS frontend and handling user workflows for students.',
        whatILearned:
          'Full-stack web app structure, connecting backend logic to frontend templates, and building student-facing UIs.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-04-25'),
        updatedAt: new Date('2025-08-01'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'steph-theme7-web',
        name: 'Theme7 Group Web Project',
        description:
          'Team web project (theme 7) — frontend-focused site built for a course.',
        technologies: ['JavaScript', 'HTML', 'CSS'],
        githubLink:
          'https://github.com/Stephie-BTRSD/steph_sji_ing3isi_group10_theme7_web_en',
        challenges:
          'Coordinating work across team members and ensuring consistent styling and functionality across pages.',
        whatILearned:
          'Collaborative front-end development, structuring HTML/CSS/JS for team projects, and basic project organization.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2024-11-26'),
        updatedAt: new Date('2025-01-23'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'hotel-reservation-system',
        name: 'Hotel Reservation System (Spring Boot)',
        description:
          'Full-stack hotel reservation system built with Spring Boot and a web frontend.',
        technologies: ['Spring Boot', 'Java', 'Thymeleaf', 'HTML', 'CSS'],
        githubLink:
          'https://github.com/NinjaShadowBoy/Hotel-Reservation-System-with-Spring-Boot',
        challenges:
          'Managing booking flows, preventing double-bookings, and synchronizing data between backend and frontend.',
        whatILearned:
          'Spring Boot application patterns, server-side templating and handling reservation logic reliably.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-04-28'),
        updatedAt: new Date('2025-06-08'),
        featured: true,
        photosUrls: [],
      },
      {
        id: 'portfolio-backend',
        name: 'Portfolio Backend',
        description: 'Backend for a personal portfolio, implemented in Kotlin.',
        technologies: ['Kotlin', 'REST API', 'Docker'],
        githubLink: 'https://github.com/NinjaShadowBoy/portfolio-backend',
        challenges:
          'Designing a small backend API surface and packaging the service for deployment with Docker.',
        whatILearned:
          'Kotlin for backend development, building REST endpoints, and basic containerization.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-07-15'),
        updatedAt: new Date('2025-10-27'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'banking-system-java',
        name: 'Banking System With Java',
        description: 'A standalone application to simulate a banking system.',
        technologies: ['Java', 'Object-oriented design', 'Collections'],
        githubLink: 'https://github.com/NinjaShadowBoy/BankingSystemWithJava',
        challenges:
          'Modeling banking concepts (accounts, transactions) and ensuring correct state changes and validations.',
        whatILearned:
          'Core Java application design, data modeling with collections, and command-line/standalone app structure.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2024-12-13'),
        updatedAt: new Date('2025-01-17'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'rmi-protocol',
        name: 'RMI Protocol',
        description:
          'Java project focused on RMI/networking concepts and protocol experiments.',
        technologies: ['Java', 'Java RMI', 'Networking'],
        githubLink: 'https://github.com/NinjaShadowBoy/RMI-Protocol',
        challenges:
          'Designing and implementing remote method invocation patterns and handling distributed communication edge cases.',
        whatILearned:
          'Java networking concepts, RMI usage patterns, and debugging remote interactions.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-09-24'),
        updatedAt: new Date('2025-09-24'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'atelier-git-workshop',
        name: 'Atelier Git Workshop',
        description:
          'Getting to grips with Git/GitHub/GitLab workshop materials and exercises.',
        technologies: ['Git', 'GitHub', 'GitLab'],
        githubLink:
          'https://github.com/NinjaShadowBoy/atelierGit1_Abena_Alex-Moutcheu_Gift',
        challenges:
          'Learning and teaching core git workflows, resolving merge conflicts and using branching strategies.',
        whatILearned:
          'Practical Git workflows, collaboration practices on GitHub/GitLab, and common troubleshooting techniques.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-09-15'),
        updatedAt: new Date('2025-09-15'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'ticket-tracker',
        name: 'Practical Evaluation - Ticket Tracker',
        description:
          'A ticket-tracker project (practical evaluation) implemented in TypeScript.',
        technologies: ['TypeScript', 'Web application', 'API design'],
        githubLink:
          'https://github.com/NinjaShadowBoy/Practical-Evaluation-ticket-tracker-Abena_Alex-ING4ISI',
        challenges:
          'Implementing ticket CRUD flows, ensuring type-safety across codebase, and validating user input.',
        whatILearned:
          'TypeScript project structure, data modelling with types/interfaces, and building reliable web features.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-10-07'),
        updatedAt: new Date('2025-10-07'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'portfolio-app',
        name: 'Portfolio App',
        description:
          'Personal portfolio frontend combining TypeScript and CSS for styling.',
        technologies: ['TypeScript', 'CSS', 'HTML', 'Frontend'],
        githubLink: 'https://github.com/NinjaShadowBoy/portfolio-app',
        challenges:
          'Crafting a responsive layout, organizing styles, and integrating TypeScript-driven UI logic.',
        whatILearned:
          'Frontend structure with TypeScript, advanced CSS styling, and creating a presentable portfolio site.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-07-15'),
        updatedAt: new Date('2025-10-27'),
        featured: false,
        photosUrls: [],
      },
      {
        id: 'connect4-react',
        name: 'Connect 4 (React)',
        description:
          'The classic Connect 4 game implemented in React with TypeScript.',
        technologies: ['TypeScript', 'React', 'CSS', 'Game logic'],
        githubLink: 'https://github.com/NinjaShadowBoy/Connect4WithReact',
        challenges:
          'Designing game state management, implementing turn logic, and keeping UI performant.',
        whatILearned:
          'React component design, state management in TypeScript, and implementing game algorithms in the browser.',
        isExpanded: false,
        ratings: [],
        averageRating: 0,
        createdAt: new Date('2025-01-22'),
        updatedAt: new Date('2025-03-11'),
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
