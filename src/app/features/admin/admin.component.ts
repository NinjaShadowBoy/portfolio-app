import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { ProjectDataService } from '../../core/services/project-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project } from '../../core/interfaces/project.interface';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { JsonImportComponent } from './components/json-import/json-import.component';
import { PhotoManagerComponent } from './components/photo-manager/photo-manager.component';
import { TechnologiesService } from '../../core/services/technologies.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ProjectFormComponent,
    JsonImportComponent,
    PhotoManagerComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);
  private techService = inject(TechnologiesService);

  getTechIcon(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.logo;
  }

  getTechDocUrl(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.docUrl;
  }

  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  get user() {
    return this.auth.user();
  }

  get isAdmin() {
    return this.auth.isAdmin();
  }

  // Project form mode
  formMode = signal<'create' | 'edit'>('create');
  editingProject = signal<Project | null>(null);

  // JSON mode
  jsonMode = signal(false);

  // Projects list
  projects = this.projectService.projects;

  // Photo management
  selectedProjectForPhotos = signal<Project | null>(null);

  goHome() {
    this.router.navigateByUrl('/home');
  }

  // CRUD operations
  onSaveProject(projectData: any) {
    if (this.formMode() === 'create') {
      this.createProject(projectData);
    } else {
      const proj = this.editingProject();
      if (proj) {
        this.updateProject(proj.id, projectData);
      }
    }
  }

  createProject(projectData: any) {
    this.projectService.createProject(projectData).subscribe({
      next: (newProject) => {
        this.notificationService.success(
          $localize`:@@projectCreated:Project "${newProject.name}" created successfully!`
        );
        this.resetForm();
      },
      error: (err) => {
        console.error('Error creating project:', err);
        this.notificationService.error(
          $localize`:@@projectCreateFailed:Failed to create project. Check console for details.`
        );
      },
    });
  }

  editProject(project: Project) {
    this.formMode.set('edit');
    this.editingProject.set(project);

    // Scroll to form
    document.querySelector('.project-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  updateProject(projectId: number, projectData: any) {
    this.projectService.updateProject(projectId, projectData).subscribe({
      next: (updatedProject) => {
        this.notificationService.success(
          $localize`:@@projectUpdated:Project "${updatedProject.name}" updated successfully!`
        );
        this.resetForm();
      },
      error: (err) => {
        console.error('Error updating project:', err);
        this.notificationService.error(
          $localize`:@@projectUpdateFailed:Failed to update project. Check console for details.`
        );
      },
    });
  }

  deleteProject(project: Project) {
    if (
      !confirm(
        $localize`:@@projectDeleteConfirm:Are you sure you want to delete "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.notificationService.success(
          $localize`:@@projectDeleted:Project "${project.name}" deleted successfully!`
        );
        if (this.editingProject()?.id === project.id) {
          this.resetForm();
        }
      },
      error: (err) => {
        console.error('Error deleting project:', err);
        this.notificationService.error(
          $localize`:@@projectDeleteFailed:Failed to delete project. Check console for details.`
        );
      },
    });
  }

  resetForm() {
    this.formMode.set('create');
    this.editingProject.set(null);
  }

  // JSON Mode Toggle
  toggleJsonMode() {
    this.jsonMode.update((mode) => !mode);
  }

  onJsonImport(data: any) {
    if (Array.isArray(data)) {
      this.processBulkProjects(data);
    } else {
      this.processSingleProject(data);
    }
  }

  processSingleProject(data: any) {
    if (data.id) {
      // Update existing project
      this.projectService.updateProject(data.id, data).subscribe({
        next: (updatedProject: Project) => {
          this.notificationService.success(
            $localize`:@@projectUpdated:Project "${updatedProject.name}" updated successfully!`
          );
        },
        error: (err: any) => {
          console.error('Error updating project:', err);
          this.notificationService.error($localize`:@@projectUpdateFailedShort:Failed to update project`);
        },
      });
    } else {
      // Create new project
      this.projectService.createProject(data).subscribe({
        next: (newProject: Project) => {
          this.notificationService.success(
            $localize`:@@projectCreated:Project "${newProject.name}" created successfully!`
          );
        },
        error: (err: any) => {
          console.error('Error creating project:', err);
          this.notificationService.error($localize`:@@projectCreateFailedShort:Failed to create project`);
        },
      });
    }
  }

  processBulkProjects(data: any[]) {
    const requests = data.map((project) =>
      project.id
        ? this.projectService.updateProject(project.id, project)
        : this.projectService.createProject(project)
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.notificationService.success(
          $localize`:@@bulkProcessed:Successfully processed ${results.length} project(s)`
        );
      },
      error: (err: any) => {
        console.error('Error processing bulk projects:', err);
        this.notificationService.error($localize`:@@bulkProcessFailed:Some projects failed to process`);
      },
    });
  }

  // Photo Management Methods
  openPhotoManager(project: Project) {
    this.selectedProjectForPhotos.set(project);
  }

  closePhotoManager() {
    this.selectedProjectForPhotos.set(null);
  }

  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }
}
