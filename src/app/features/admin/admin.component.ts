import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, tap } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { SegmentedToggleComponent, SegmentedToggleOption } from '../../shared/ui/segmented-toggle/segmented-toggle.component';
import { UsersPanelComponent } from './components/users-panel/users-panel.component';
import { FeedbackPanelComponent } from './components/feedback-panel/feedback-panel.component';
import { MessagesPanelComponent } from './components/messages-panel/messages-panel.component';
import { AssistantPanelComponent } from './components/assistant-panel/assistant-panel.component';
import { ArticlesPanelComponent } from './components/articles-panel/articles-panel.component';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDataService } from '../../core/services/project-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CanComponentDeactivate } from '../../core/guards/auth.guard';
import { injectDeferDelete } from '../../core/utils/deferred-action';
import { Project, ProjectCreateRequest, ProjectImport } from '../../core/interfaces/project.interface';
import { ProjectSaveStatus } from './components/project-form/project-form.component';
import { JsonImportComponent } from './components/json-import/json-import.component';
import { ProjectEditorComponent } from './components/project-editor/project-editor.component';
import { ProjectsListComponent } from './components/projects-list/projects-list.component';

type AdminTab = 'overview' | 'projects' | 'users' | 'feedback' | 'messages' | 'articles' | 'assistant';

/** The `?project=` query param while the project editor dialog is open. */
type EditorParam = 'new' | number | null;

const ADMIN_TABS: readonly SegmentedToggleOption[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
  { value: 'users', label: 'Users' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'messages', label: 'Messages' },
  { value: 'articles', label: 'Articles' },
  { value: 'assistant', label: 'Assistant' },
];

function parseTab(value: string | null): AdminTab {
  return ADMIN_TABS.some((tab) => tab.value === value) ? (value as AdminTab) : 'overview';
}

/** 'new' or a numeric id; anything else is ignored. */
function parseProjectParam(value: string | null): EditorParam {
  if (value === 'new') return 'new';
  return value !== null && /^\d+$/.test(value) ? Number(value) : null;
}

@Component({
  selector: 'app-admin',
  imports: [
    JsonImportComponent,
    ProjectEditorComponent,
    ProjectsListComponent,
    SegmentedToggleComponent,
    UsersPanelComponent,
    FeedbackPanelComponent,
    MessagesPanelComponent,
    ArticlesPanelComponent,
    AssistantPanelComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin-shared.css', './admin.component.css'],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class AdminComponent implements CanComponentDeactivate {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);
  private adminService = inject(AdminService);
  private confirm = inject(ConfirmService);
  private readonly deferDelete = injectDeferDelete();
  private readonly editor = viewChild(ProjectEditorComponent);
  private readonly jsonDialog = viewChild<ElementRef<HTMLDialogElement>>('jsonDialog');

  readonly user = this.auth.user;
  readonly isAdmin = this.auth.isAdmin;
  readonly projects = this.projectService.projects;

  /** Projects waiting out their Undo window; hidden from the table until the delete commits or is undone. */
  private readonly hiddenProjectIds = signal<ReadonlySet<number>>(new Set());
  readonly visibleProjects = computed(() => {
    const hidden = this.hiddenProjectIds();
    return this.projects().filter((project) => !hidden.has(project.id));
  });

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

  /**
   * Today's chat usage for the "Assistant messages today" overview card, fetched
   * the same way as the counts (days=1). A failure hides the card: it is a nice
   * extra, not something the overview should complain about.
   */
  private chatUsageResource = rxResource({
    params: () => (this.isAdmin() && this.tab() === 'overview' ? 1 : undefined),
    stream: () => this.adminService.getChatUsage(1),
  });
  readonly chatToday = computed(() =>
    this.chatUsageResource.hasValue() ? this.chatUsageResource.value().today : null,
  );

  /**
   * The `?project=` query param: 'new' for creation, a numeric id for editing.
   * The edited project is looked up live from the store, so a save or reload
   * shows in the form; an unknown id opens nothing.
   */
  readonly editorParam = signal<EditorParam>(parseProjectParam(this.route.snapshot.queryParamMap.get('project')));
  /** The project loaded into the editor dialog, or null when creating. */
  readonly editorProject = computed(() => {
    const param = this.editorParam();
    return param === 'new' || param === null
      ? null
      : (this.projects().find((project) => project.id === param) ?? null);
  });
  readonly editorOpen = computed(() => this.editorParam() === 'new' || this.editorProject() !== null);
  /** Opened from a row's Photos button: the editor scrolls that section into view. */
  readonly openWithPhotos = signal(false);
  readonly saveStatus = signal<ProjectSaveStatus>('idle');
  /** The small "Import JSON" dialog. */
  readonly jsonOpen = signal(false);

  constructor() {
    effect(() => {
      const dialog = this.jsonDialog();
      if (dialog) untracked(() => dialog.nativeElement.showModal());
    });

    // Keep the editor's param in step with the URL, so a reload or shared
    // link reopens the same editor and removing the param closes it.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.editorParam.set(parseProjectParam(params.get('project')));
      });
  }

  async selectTab(value: string) {
    const tab = parseTab(value);
    if (tab === this.tab()) return;
    if (this.tab() === 'projects' && !(await this.confirmDiscard())) return;
    this.tab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'overview' ? null : tab },
      replaceUrl: true,
    });
  }

  goHome() {
    this.router.navigateByUrl('/home');
  }

  /** Router guard: leaving /admin with unsaved project edits asks first. */
  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmDiscard();
  }

  /** Reload or tab close with unsaved edits: the browser shows its own prompt. */
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  /** "New project" in the toolbar or the empty table. */
  async startNewProject() {
    await this.openEditor('new', false);
  }

  /** A row's Edit opens the editor for that project. */
  async editProject(project: Project) {
    await this.openEditor(project.id, false);
  }

  /** A row's Photos opens the editor scrolled to the photos section. */
  async editProjectPhotos(project: Project) {
    await this.openEditor(project.id, true);
  }

  async openJsonImport() {
    this.jsonOpen.set(true);
  }

  /** The editor is done; removing the ?project= param unmounts it. */
  async closeEditor() {
    this.openWithPhotos.set(false);
    void this.setEditorParam(null);
  }

  closeJsonImport() {
    this.jsonOpen.set(false);
  }

  /** Escape's native close request on the JSON dialog: the button does it instead. */
  cancelJsonImport(event: Event) {
    event.preventDefault();
    this.closeJsonImport();
  }

  /** The dialog closed some other way, e.g. dev tools or a form submit. */
  onJsonDialogClose() {
    this.jsonOpen.set(false);
  }

  onSaveProject(projectData: ProjectCreateRequest) {
    const id = this.editorProject()?.id;
    const updating = id !== undefined;
    this.saveStatus.set('saving');
    this.importProject({ ...projectData, id }).subscribe({
      next: (saved) => {
        this.saveStatus.set('saved');
        this.notificationService.success(
          updating
            ? $localize`:@@projectUpdated:Project "${saved.name}" updated successfully!`
            : $localize`:@@projectCreated:Project "${saved.name}" created successfully!`
        );
        if (!updating) {
          // Stay on the new project, now in edit mode, so photos can be added next.
          void this.setEditorParam(saved.id);
        }
      },
      error: (err) => {
        console.error('Error saving project:', err);
        this.saveStatus.set('error');
        this.notificationService.error(
          updating
            ? $localize`:@@projectUpdateFailed:Failed to update project. Check console for details.`
            : $localize`:@@projectCreateFailed:Failed to create project. Check console for details.`
        );
      },
    });
  }

  /** Imported records with an id update that project; the rest are created. */
  onJsonImport(data: ProjectImport | ProjectImport[]) {
    if (!Array.isArray(data)) {
      this.saveImported(data);
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

  deleteProject(project: Project) {
    this.deferDelete({
      hide: () => {
        this.hiddenProjectIds.update((ids) => new Set(ids).add(project.id));
        if (this.editorParam() === project.id) {
          this.openWithPhotos.set(false);
          void this.setEditorParam(null);
        }
      },
      restore: () => this.unhideProject(project.id),
      commit: () =>
        this.projectService.deleteProject(project.id).pipe(tap(() => this.unhideProject(project.id))),
      message: $localize`:@@projectDeletePending:Deleted "${project.name}".`,
      errorMessage: $localize`:@@projectDeleteFailed:Could not delete "${project.name}". It is back in the list.`,
    });
  }

  private hasUnsavedChanges(): boolean {
    return this.editor()?.dirty() ?? false;
  }

  private confirmDiscard(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;
    const name = this.editorProject()?.name;
    return this.confirm.ask({
      title: $localize`:@@adminDiscardTitle:Discard unsaved changes?`,
      body: name
        ? $localize`:@@adminDiscardBodyEdit:Your changes to "${name}:name:" have not been saved.`
        : $localize`:@@adminDiscardBodyCreate:The new project has not been saved.`,
      confirmLabel: $localize`:@@adminDiscardConfirm:Discard changes`,
      cancelLabel: $localize`:@@adminDiscardCancel:Keep editing`,
      tone: 'danger',
    });
  }

  /**
   * Opens the editor for 'new' or a project id, asking first when a different
   * project's unsaved edits would be lost.
   */
  private async openEditor(param: Exclude<EditorParam, null>, photos: boolean) {
    const current = this.editorParam();
    if (current !== null && current !== param && !(await this.confirmDiscard())) return;
    this.openWithPhotos.set(photos);
    void this.setEditorParam(param);
  }

  private setEditorParam(param: EditorParam): Promise<boolean> {
    // The signal drives the UI at once; the navigate below (which completes
    // several microtasks later, after our callers' awaits) only syncs the URL.
    this.editorParam.set(param);
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { project: param === null ? null : param },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private unhideProject(id: number) {
    this.hiddenProjectIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  /** A single JSON import: a save that leaves the form alone. */
  private saveImported(project: ProjectImport) {
    const updating = project.id !== undefined;
    this.importProject(project).subscribe({
      next: (saved) => {
        this.notificationService.success(
          updating
            ? $localize`:@@projectUpdated:Project "${saved.name}" updated successfully!`
            : $localize`:@@projectCreated:Project "${saved.name}" created successfully!`
        );
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
