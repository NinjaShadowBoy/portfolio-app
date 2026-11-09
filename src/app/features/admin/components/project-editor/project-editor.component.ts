import { Component, DestroyRef, DOCUMENT, ElementRef, computed, effect, inject, input, output, untracked, viewChild } from '@angular/core';
import { Project, ProjectCreateRequest } from '../../../../core/interfaces/project.interface';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ProjectFormComponent, ProjectSaveStatus } from '../project-form/project-form.component';
import { PhotoManagerComponent } from '../photo-manager/photo-manager.component';

/**
 * The projects tab's modal editor: one native `<dialog>` holding the project
 * form, the photo manager (existing projects only), the advanced actions and
 * a footer with Save/Close. Rendered with `@if` while it is open, so closing
 * destroys it — the destruction flushes a pending photo-order save and
 * disposes the upload queue. The parent owns the URL sync: it keeps a
 * `?project=` query param alive while the dialog shows.
 *
 * Escape and backdrop clicks go through `requestClose`, which asks the photo
 * manager about running uploads first and ConfirmService when the form is
 * dirty. `Ctrl/Cmd+S` saves while the dialog is open.
 */
@Component({
  selector: 'app-project-editor',
  imports: [ProjectFormComponent, PhotoManagerComponent],
  templateUrl: './project-editor.component.html',
  styleUrl: './project-editor.component.css',
})
export class ProjectEditorComponent {
  private confirm = inject(ConfirmService);
  private document = inject(DOCUMENT);

  /** The edited project; null creates one. Must be a live store lookup, not a snapshot. */
  readonly project = input<Project | null>(null);
  readonly saveStatus = input<ProjectSaveStatus>('idle');
  /** Opened from a row's Photos button: scroll the photos section into view. */
  readonly showPhotosFirst = input(false);

  readonly form = viewChild(ProjectFormComponent);
  readonly photoManager = viewChild(PhotoManagerComponent);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly photosSection = viewChild<ElementRef<HTMLElement>>('photosSection');

  readonly save = output<ProjectCreateRequest>();
  readonly deleteProject = output<Project>();
  /** The editor is done; the parent unmounts it after this. */
  readonly closed = output<void>();

  readonly formMode = computed(() => (this.project() ? 'edit' : 'create'));
  readonly dirty = computed(() => this.form()?.dirty() ?? false);
  readonly canSave = computed(
    () => this.saveStatus() !== 'saving' && this.form()?.saveEnabled() === true
  );

  /** The element focused when the dialog opened, to focus again on close. */
  private readonly opener: HTMLElement | null;

  constructor() {
    // Grabbing the opener here, before the dialog renders, still lands on the
    // button that started the flow (New project, or a row's Edit/Photos).
    this.opener = this.document.activeElement as HTMLElement | null;
    inject(DestroyRef).onDestroy(() => {
      const dialog = untracked(this.dialogRef).nativeElement;
      if (dialog.open) dialog.close();
      if (this.opener?.isConnected) this.opener.focus();
    });

    // The queries only resolve after the first render, and `showModal()`
    // cannot run before the element exists. The photos section sits in an
    // embedded @if view, so its query resolves a pass later than the
    // dialog's — reading it reactively re-runs this effect when it appears.
    effect(() => {
      const dialog = this.dialogRef();
      const photos = this.photosSection();
      const photosFirst = this.showPhotosFirst();
      if (!dialog) return;
      untracked(() => {
        const element = dialog.nativeElement;
        if (!element.open) element.showModal();
        if (photos && photosFirst) {
          photos.nativeElement.scrollIntoView({ block: 'start' });
        } else if (!photosFirst) {
          this.form()?.focusFirstField();
        }
      });
    });
  }

  submit() {
    if (this.canSave()) this.form()?.submitForm();
  }

  delete() {
    const project = this.project();
    if (project) this.deleteProject.emit(project);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 's') {
        event.preventDefault();
        this.submit();
      }
      return;
    }
    if (event.key === 'Escape') {
      // A keydown whose default was already prevented (the reorder grid has a
      // photo picked up) must not close the editor.
      if (event.defaultPrevented) return;
      event.preventDefault();
      void this.requestClose();
    }
  }

  /** A click that reached the dialog element itself is a backdrop click. */
  onBackdropClick(event: MouseEvent) {
    if (event.target === untracked(this.dialogRef).nativeElement) void this.requestClose();
  }

  /** Escape produced a close request outside the keydown path (older engines). */
  onCancel(event: Event) {
    event.preventDefault();
    void this.requestClose();
  }

  /** Asks about running uploads and unsaved edits; then reports the close. */
  async requestClose() {
    const manager = this.photoManager();
    if (manager && !(await manager.canClose())) return;
    if (this.dirty() && !(await this.confirm.ask(discardChangesOptions(this.project())))) return;
    this.closed.emit();
  }
}

/**
 * The discard question shared with the projects tab's guard, so the wording
 * stays in one place.
 */
function discardChangesOptions(project: Project | null) {
  const name = project?.name;
  return {
    title: $localize`:@@adminDiscardTitle:Discard unsaved changes?`,
    body: name
      ? $localize`:@@adminDiscardBodyEdit:Your changes to "${name}:name:" have not been saved.`
      : $localize`:@@adminDiscardBodyCreate:The new project has not been saved.`,
    confirmLabel: $localize`:@@adminDiscardConfirm:Discard changes`,
    cancelLabel: $localize`:@@adminDiscardCancel:Keep editing`,
    tone: 'danger' as const,
  };
}
