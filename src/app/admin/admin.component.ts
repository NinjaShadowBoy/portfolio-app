import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ProjectDataService } from '../services/project-data.service';
import { NotificationService } from '../services/notification.service';
import { Project } from '../interfaces/project.interface';
import { forkJoin } from 'rxjs';
import { PhotoService } from '../services/photo.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);
  private photoService = inject(PhotoService);

  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  get user() {
    return this.auth.user();
  }

  get isAdmin() {
    return this.auth.isAdmin();
  }

  // Project form mode
  formMode = signal<'create' | 'edit'>('create');
  editingProjectId = signal<number | null>(null);

  // JSON mode
  jsonMode = signal(false);
  jsonInput = signal('');
  jsonError = signal('');

  // Projects list
  projects = this.projectService.projects;

  // Photo management
  selectedProjectForPhotos = signal<Project | null>(null);
  selectedFiles: File[] = [];
  isUploadingPhotos = signal(false);

  // Project form
  projectForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
    technologies: new FormControl('', Validators.required),
    githubLink: new FormControl('', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/),
    ]),
    challenges: new FormControl('', Validators.required),
    whatILearned: new FormControl('', Validators.required),
    featured: new FormControl(false),
  });

  goHome() {
    this.router.navigateByUrl('/home');
  }

  // Form CRUD operations
  submitForm() {
    if (this.projectForm.invalid) {
      this.notificationService.error('Please fill out all required fields.');
      return;
    }

    const projectData = this.buildProjectData();

    if (this.formMode() === 'create') {
      this.createProject(projectData);
    } else if (this.editingProjectId() !== null) {
      this.updateProject(this.editingProjectId()!, projectData);
    }
  }

  private buildProjectData(): {
    name: string;
    description: string;
    technologies: string[];
    githubLink: string;
    challenges: string;
    whatILearned: string;
    featured: boolean;
  } {
    const formValue = this.projectForm.value;
    const technologies = formValue.technologies
      ? formValue.technologies.split(',').map((t) => t.trim())
      : [];

    return {
      name: formValue.name || '',
      description: formValue.description || '',
      technologies,
      githubLink: formValue.githubLink || '',
      challenges: formValue.challenges || '',
      whatILearned: formValue.whatILearned || '',
      featured: formValue.featured || false,
    };
  }

  createProject(projectData: {
    name: string;
    description: string;
    technologies: string[];
    githubLink: string;
    challenges: string;
    whatILearned: string;
    featured: boolean;
  }) {
    this.projectService.createProject(projectData).subscribe({
      next: (newProject) => {
        this.notificationService.success(
          `Project "${newProject.name}" created successfully!`
        );
        this.resetForm();
      },
      error: (err) => {
        console.error('Error creating project:', err);
        this.notificationService.error(
          'Failed to create project. Check console for details.'
        );
      },
    });
  }

  editProject(project: Project) {
    this.formMode.set('edit');
    this.editingProjectId.set(project.id);

    this.projectForm.patchValue({
      name: project.name,
      description: project.description,
      technologies: project.technologies.join(', '),
      githubLink: project.githubLink,
      challenges: project.challenges,
      whatILearned: project.whatILearned,
      featured: project.featured,
    });

    // Scroll to form
    document.querySelector('.project-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  updateProject(
    projectId: number,
    projectData: {
      name: string;
      description: string;
      technologies: string[];
      githubLink: string;
      challenges: string;
      whatILearned: string;
      featured: boolean;
    }
  ) {
    this.projectService.updateProject(projectId, projectData).subscribe({
      next: (updatedProject) => {
        this.notificationService.success(
          `Project "${updatedProject.name}" updated successfully!`
        );
        this.resetForm();
      },
      error: (err) => {
        console.error('Error updating project:', err);
        this.notificationService.error(
          'Failed to update project. Check console for details.'
        );
      },
    });
  }

  deleteProject(project: Project) {
    if (
      !confirm(
        `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.notificationService.success(
          `Project "${project.name}" deleted successfully!`
        );
      },
      error: (err) => {
        console.error('Error deleting project:', err);
        this.notificationService.error(
          'Failed to delete project. Check console for details.'
        );
      },
    });
  }

  resetForm() {
    this.projectForm.reset({ featured: false });
    this.formMode.set('create');
    this.editingProjectId.set(null);
  }

  // JSON CRUD operations
  toggleJsonMode() {
    this.jsonMode.update((mode) => !mode);
    this.jsonInput.set('');
    this.jsonError.set('');
  }

  processJson() {
    const input = this.jsonInput();
    if (!input.trim()) {
      this.jsonError.set('Please enter JSON data');
      return;
    }

    try {
      const data = JSON.parse(input);
      this.jsonError.set('');

      // Check if it's an array or single object
      if (Array.isArray(data)) {
        this.processBulkProjects(data);
      } else {
        this.processSingleProject(data);
      }
    } catch (err) {
      this.jsonError.set('Invalid JSON format. Please check your input.');
      this.notificationService.error('Invalid JSON format');
    }
  }

  processSingleProject(data: any) {
    if (!this.validateProjectData(data)) {
      this.jsonError.set(
        'Missing required fields: name, description, technologies, githubLink, challenges, whatILearned'
      );
      return;
    }

    if (data.id) {
      // Update existing project
      this.projectService.updateProject(data.id, data).subscribe({
        next: (updatedProject: Project) => {
          this.notificationService.success(
            `Project "${updatedProject.name}" updated successfully!`
          );
          this.jsonInput.set('');
        },
        error: (err: any) => {
          console.error('Error updating project:', err);
          this.jsonError.set('Failed to update project');
          this.notificationService.error('Failed to update project');
        },
      });
    } else {
      // Create new project
      this.projectService.createProject(data).subscribe({
        next: (newProject: Project) => {
          this.notificationService.success(
            `Project "${newProject.name}" created successfully!`
          );
          this.jsonInput.set('');
        },
        error: (err: any) => {
          console.error('Error creating project:', err);
          this.jsonError.set('Failed to create project');
          this.notificationService.error('Failed to create project');
        },
      });
    }
  }

  processBulkProjects(data: any[]) {
    const validProjects = data.filter((p) => this.validateProjectData(p));

    if (validProjects.length === 0) {
      this.jsonError.set('No valid projects found in array');
      return;
    }

    const requests = validProjects.map((project) =>
      project.id
        ? this.projectService.updateProject(project.id, project)
        : this.projectService.createProject(project)
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.notificationService.success(
          `Successfully processed ${results.length} project(s)`
        );
        this.jsonInput.set('');
      },
      error: (err: any) => {
        console.error('Error processing bulk projects:', err);
        this.notificationService.error('Some projects failed to process');
        this.jsonInput.set('');
      },
    });
  }

  validateProjectData(data: any): boolean {
    return !!(
      data.name &&
      data.description &&
      data.technologies &&
      data.githubLink &&
      data.challenges &&
      data.whatILearned
    );
  }

  // Helper to generate sample JSON
  getSampleJson(): string {
    return JSON.stringify(
      {
        name: 'Sample Project',
        description: 'A sample project description',
        technologies: ['TypeScript', 'Angular'],
        githubLink: 'https://github.com/username/repo',
        challenges: 'Sample challenges',
        whatILearned: 'Sample learnings',
        featured: false,
      },
      null,
      2
    );
  }

  getSampleJsonArray(): string {
    return JSON.stringify(
      [
        {
          name: 'Project 1',
          description: 'First project description',
          technologies: ['JavaScript'],
          githubLink: 'https://github.com/username/repo1',
          challenges: 'Challenges 1',
          whatILearned: 'Learnings 1',
          featured: false,
        },
        {
          name: 'Project 2',
          description: 'Second project description',
          technologies: ['TypeScript', 'React'],
          githubLink: 'https://github.com/username/repo2',
          challenges: 'Challenges 2',
          whatILearned: 'Learnings 2',
          featured: true,
        },
      ],
      null,
      2
    );
  }

  copySampleJson() {
    navigator.clipboard.writeText(this.getSampleJson());
    this.notificationService.info('Sample JSON copied to clipboard');
  }

  copySampleJsonArray() {
    navigator.clipboard.writeText(this.getSampleJsonArray());
    this.notificationService.info('Sample JSON array copied to clipboard');
  }

  // Photo Management Methods
  openPhotoManager(project: Project) {
    this.selectedProjectForPhotos.set(project);
    this.selectedFiles = [];
  }

  closePhotoManager() {
    this.selectedProjectForPhotos.set(null);
    this.selectedFiles = [];
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  uploadPhotos() {
    const project = this.selectedProjectForPhotos();
    if (!project) {
      this.notificationService.error('No project selected');
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.notificationService.error('Please select at least one photo to upload');
      return;
    }

    this.isUploadingPhotos.set(true);

    const uploadObservables = this.selectedFiles.map(file =>
      this.photoService.uploadProjectPhoto(project.id, file)
    );

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        this.notificationService.success(
          `Successfully uploaded ${results.length} photo(s)`
        );
        this.projectService.refreshProjects();
        this.selectedFiles = [];
        this.isUploadingPhotos.set(false);

        const fileInput = document.getElementById('photoInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (err) => {
        console.error('Error uploading photos:', err);
        this.notificationService.error('Failed to upload some photos');
        this.isUploadingPhotos.set(false);
      }
    });
  }

  deletePhoto(photoId: number) {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    this.photoService.deletePhoto(photoId).subscribe({
      next: () => {
        this.notificationService.success('Photo deleted successfully');
        this.projectService.refreshProjects();
      },
      error: (err) => {
        console.error('Error deleting photo:', err);
        this.notificationService.error('Failed to delete photo');
      }
    });
  }

  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }
}
