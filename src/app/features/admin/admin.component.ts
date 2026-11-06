import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { SegmentedToggleComponent, SegmentedToggleOption } from '../../shared/ui/segmented-toggle/segmented-toggle.component';
import { UsersPanelComponent } from './components/users-panel/users-panel.component';
import { FeedbackPanelComponent } from './components/feedback-panel/feedback-panel.component';
import { MessagesPanelComponent } from './components/messages-panel/messages-panel.component';
import { ArticlesPanelComponent } from './components/articles-panel/articles-panel.component';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDataService } from '../../core/services/project-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project, ProjectCreateRequest, ProjectImport } from '../../core/interfaces/project.interface';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { JsonImportComponent } from './components/json-import/json-import.component';
import { PhotoManagerComponent } from './components/photo-manager/photo-manager.component';
import { ProjectsListComponent } from './components/projects-list/projects-list.component';

type AdminTab = 'overview' | 'projects' | 'users' | 'feedback' | 'messages' | 'articles';

const ADMIN_TABS: readonly SegmentedToggleOption[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
  { value: 'users', label: 'Users' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'messages', label: 'Messages' },
  { value: 'articles', label: 'Articles' },
];

function parseTab(value: string | null): AdminTab {
  return ADMIN_TABS.some((tab) => tab.value === value) ? (value as AdminTab) : 'overview';
}

@Component({
  selector: 'app-admin',
  imports: [
    ProjectFormComponent,
    JsonImportComponent,
    PhotoManagerComponent,
    ProjectsListComponent,
    SegmentedToggleComponent,
    UsersPanelComponent,
    FeedbackPanelComponent,
    MessagesPanelComponent,
    ArticlesPanelComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin-shared.css', './admin.component.css'],
})
export class AdminComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);
  private adminService = inject(AdminService);

  readonly user = this.auth.user;
  readonly isAdmin = this.auth.isAdmin;
  readonly projects = this.projectService.projects;

  readonly tabs = ADMIN_TABS;
  /** Synced to `?tab=` so a reload or shared link opens the same section. */
  readonly tab = signal<AdminTab>(parseTab(this.route.snapshot.queryParamMap.get('tab')));

  /** Overview counts, fetched by admins only and refetched each time the tab opens. */
  private statsResource = rxResource({
    params: () => (this.isAdmin() && this.tab() === 'overview' ? true : undefined),
    stream: () => this.adminService.getStats(),
  });
  readonly stats = computed(() => (this.statsResource.hasValue() ? this.statsResource.value() : null));
  readonly statsFailed = computed(() => this.statsResource.status() === 'error');

  selectTab(value: string) {
    const tab = parseTab(value);
    this.tab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'overview' ? null : tab },
      replaceUrl: true,
    });
  }

  /** The project loaded into the form, or null when creating. */
  readonly editingProject = signal<Project | null>(null);
  readonly formMode = computed(() => (this.editingProject() ? 'edit' : 'create'));
  readonly jsonMode = signal(false);
  readonly selectedProjectForPhotos = signal<Project | null>(null);

  goHome() {
    this.router.navigateByUrl('/home');
  }

  onSaveProject(projectData: ProjectCreateRequest) {
    const id = this.editingProject()?.id;
    this.saveProject({ ...projectData, id }, () => this.resetForm());
  }

  editProject(project: Project) {
    this.editingProject.set(project);
    document.querySelector('.project-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteProject(project: Project) {
    const confirmed = confirm(
      $localize`:@@projectDeleteConfirm:Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.notificationService.success(
          $localize`:@@projectDeleted:Project "${project.name}" deleted successfully!`
        );
        if (this.editingProject()?.id === project.id) this.resetForm();
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
    this.editingProject.set(null);
  }

  toggleJsonMode() {
    this.jsonMode.update((mode) => !mode);
  }

  /** Imported records with an id update that project; the rest are created. */
  onJsonImport(data: ProjectImport | ProjectImport[]) {
    if (!Array.isArray(data)) {
      this.saveProject(data);
      return;
    }
    forkJoin(data.map((project) => this.importProject(project))).subscribe({
      next: (results) => {
        this.notificationService.success(
          $localize`:@@bulkProcessed:Successfully processed ${results.length} project(s)`
        );
      },
      error: (err) => {
        console.error('Error processing bulk projects:', err);
        this.notificationService.error($localize`:@@bulkProcessFailed:Some projects failed to process`);
      },
    });
  }

  openPhotoManager(project: Project) {
    this.selectedProjectForPhotos.set(project);
  }

  closePhotoManager() {
    this.selectedProjectForPhotos.set(null);
  }

  private saveProject(project: ProjectImport, onSuccess?: () => void) {
    const updating = project.id !== undefined;
    this.importProject(project).subscribe({
      next: (saved) => {
        this.notificationService.success(
          updating
            ? $localize`:@@projectUpdated:Project "${saved.name}" updated successfully!`
            : $localize`:@@projectCreated:Project "${saved.name}" created successfully!`
        );
        onSuccess?.();
      },
      error: (err) => {
        console.error('Error saving project:', err);
        this.notificationService.error(
          updating
            ? $localize`:@@projectUpdateFailed:Failed to update project. Check console for details.`
            : $localize`:@@projectCreateFailed:Failed to create project. Check console for details.`
        );
      },
    });
  }

  private importProject(project: ProjectImport) {
    return project.id !== undefined
      ? this.projectService.updateProject(project.id, project)
      : this.projectService.createProject(project);
  }
}
