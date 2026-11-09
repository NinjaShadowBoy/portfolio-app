import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { ProjectEditorComponent } from './project-editor.component';
import { ProjectFormComponent, ProjectSaveStatus } from '../project-form/project-form.component';
import { PhotoService } from '../../../../core/services/photo.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { Project, ProjectCreateRequest } from '../../../../core/interfaces/project.interface';

const project: Project = {
  id: 7,
  name: 'Hive',
  description: 'A beekeeping companion app',
  technologies: ['Kotlin'],
  githubLink: null,
  demoLink: null,
  challenges: 'c',
  whatILearned: 'w',
  averageRating: 0,
  totalRatings: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  featured: false,
  displayOrder: 0,
  photoUrls: [],
};

@Component({
  imports: [ProjectEditorComponent],
  template: `
    <button type="button" id="opener" (click)="open.set(true)">Open</button>
    @if (open()) {
      <app-project-editor
        [project]="editorProject()" [saveStatus]="saveStatus()" [showPhotosFirst]="showPhotosFirst()"
        (save)="saved.push($event)" (deleteProject)="deleted.push($event)" (closed)="editorClosed()" />
    }
  `,
})
class HostComponent {
  readonly open = signal(false);
  readonly saveStatus = signal<ProjectSaveStatus>('idle');
  readonly showPhotosFirst = signal(false);
  readonly editorProject = signal<Project | null>(null);

  saved: ProjectCreateRequest[] = [];
  deleted: Project[] = [];
  closeCount = 0;

  editorClosed() {
    this.closeCount++;
    this.open.set(false);
    this.editorProject.set(null);
  }
}

describe('ProjectEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let confirm: { ask: ReturnType<typeof vi.fn> };
  let scroller: ReturnType<typeof vi.fn>;

  const editor = () => fixture.debugElement.query((de) => de.componentInstance instanceof ProjectEditorComponent)
    ?.componentInstance as ProjectEditorComponent;
  const dialog = (): HTMLDialogElement => fixture.nativeElement.querySelector('.project-editor');
  const form = () => fixture.debugElement.query((de) => de.componentInstance instanceof ProjectFormComponent)
    ?.componentInstance as ProjectFormComponent;
  // requestClose walks several awaits before it emits anything.
  const settled = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };
  const footerButton = (label: string): HTMLButtonElement =>
    Array.from(dialog().querySelectorAll<HTMLButtonElement>('.editor-footer button'))
      .find((b) => b.textContent?.trim() === label)!;
  const openEditor = () => {
    host.open.set(true);
    fixture.detectChanges();
  };
  /** Simulates the create flow: the saved project replaces the null input. */
  const switchToSaved = () => {
    host.editorProject.set(project);
    fixture.detectChanges();
  };

  const fullValue = () => ({
    ...form().projectForm.getRawValue(),
    name: 'Hive',
    description: 'A beekeeping companion app',
    technologies: 'Kotlin',
    challenges: 'c',
    whatILearned: 'w',
  });

  beforeEach(async () => {
    confirm = { ask: vi.fn().mockResolvedValue(false) };
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmService, useValue: confirm },
        // The photo manager reads the live store; the form does not fetch here.
        { provide: ProjectDataService, useValue: { projects: signal([project]), patchProject: vi.fn() } },
        {
          provide: PhotoService,
          useValue: { uploadProjectPhoto: vi.fn(), deletePhoto: vi.fn(), reorderPhotos: vi.fn() },
        },
      ],
    }).compileComponents();
    scroller = vi.fn();    Element.prototype.scrollIntoView = scroller as unknown as typeof Element.prototype.scrollIntoView;
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  it('opens as a modal for a new project, focused on the name field, with a photos hint', () => {
    openEditor();

    const dialogElement = dialog();
    expect(dialogElement).not.toBeNull();
    expect(dialogElement.open).toBe(true);
    expect(dialogElement.textContent).toContain('New project');
    expect(dialogElement.querySelector('.photos-section')).toBeNull();
    expect(dialogElement.textContent).toContain('Save the project to add photos.');
    // The French section and Advanced are collapsed.
    expect(dialogElement.querySelector('.french-fields')?.hasAttribute('open')).toBe(false);
    expect(dialogElement.querySelector('.editor-advanced')?.hasAttribute('open')).toBe(false);
    expect(document.activeElement?.id).toBe('name');
  });

  it('opens for editing with the photo manager inline and no nested modal', () => {
    host.editorProject.set(project);
    openEditor();

    const dialogElement = dialog();
    expect(dialogElement.textContent).toContain('Edit project');
    expect(dialogElement.querySelector('.photos-section app-photo-manager')).not.toBeNull();
    expect(dialogElement.querySelector('.modal-overlay')).toBeNull();
  });

  it('shows the French count in the collapsed summary', () => {
    openEditor();
    switchToSaved();

    form().projectForm.setValue({ ...fullValue(), descriptionFr: 'Une', whatILearnedFr: 'Deux' });
    fixture.detectChanges();

    const summary = dialog().querySelector('.french-fields summary');
    expect(summary?.textContent).toContain('French text');
    expect(summary?.querySelector('.french-count')?.textContent?.trim()).toBe('2 of 3 translated');
  });

  it('disables Save while the form is pristine, then saves from the footer button', () => {
    openEditor();
    switchToSaved();

    const save = footerButton('Save');
    expect(save.disabled).toBe(true);

    form().projectForm.setValue(fullValue());
    form().projectForm.markAsDirty();
    fixture.detectChanges();
    expect(save.disabled).toBe(false);

    save.click();
    expect(host.saved).toHaveLength(1);
  });

  it('saves with Ctrl+S and Cmd+S', () => {
    openEditor();
    switchToSaved();
    form().projectForm.setValue(fullValue());
    form().projectForm.markAsDirty();

    const keydown = (extra: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true, ...extra });
      dialog().dispatchEvent(event);
      return event;
    };
    const ctrl = keydown({ ctrlKey: true });
    expect(ctrl.defaultPrevented).toBe(true);
    expect(host.saved).toHaveLength(1);

    const cmd = keydown({ metaKey: true });
    expect(cmd.defaultPrevented).toBe(true);
    expect(host.saved).toHaveLength(2);
  });

  it('closes on Escape / backdrop / Close when the form is clean, without asking', async () => {
    openEditor();

    footerButton('Close').click();
    await settled();
    fixture.detectChanges();
    expect(host.closeCount).toBe(1);
    expect(dialog()).toBeNull();

    // Backdrop: a click that lands on the dialog element itself.
    openEditor();
    dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settled();
    fixture.detectChanges();
    expect(host.closeCount).toBe(2);

    openEditor();
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settled();
    fixture.detectChanges();
    expect(host.closeCount).toBe(3);
    expect(confirm.ask).not.toHaveBeenCalled();
  });

  it('asks before discarding unsaved edits, and stays open when the answer is no', async () => {
    host.editorProject.set(project);
    openEditor();
    form().projectForm.setValue({ ...fullValue(), name: 'Edited' });
    form().projectForm.markAsDirty();

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settled();

    expect(confirm.ask).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger', title: 'Discard unsaved changes?' }));
    expect(dialog()).not.toBeNull();

    confirm.ask.mockResolvedValueOnce(true);
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settled();
    fixture.detectChanges();
    expect(host.closeCount).toBe(1);
    expect(dialog()).toBeNull();
  });

  it('keeps the editor open when a keydown was already handled, like a picked-up photo', () => {
    host.editorProject.set(project);
    openEditor();

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'defaultPrevented', { value: true });
    dialog().dispatchEvent(event);

    expect(host.open()).toBe(true);
    expect(dialog()).not.toBeNull();
  });

  it('defers to the photo manager when uploads run', async () => {
    host.editorProject.set(project);
    openEditor();
    const instance = editor();

    const preventsClose = { canClose: vi.fn().mockResolvedValue(false) };
    (instance as unknown as { photoManager: () => unknown }).photoManager = () => preventsClose;

    await instance.requestClose();
    expect(preventsClose.canClose).toHaveBeenCalledTimes(1);
    expect(confirm.ask).not.toHaveBeenCalled();
    expect(host.closeCount).toBe(0);
  });

  it('returns focus to the opener when it closes', async () => {
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    openEditor();
    expect(document.activeElement?.id).toBe('name');

    footerButton('Close').click();
    await settled();
    fixture.detectChanges();

    expect(document.activeElement).toBe(opener);
  });

  it('scrolls the photos section into view when opened from a Photos button', () => {
    host.editorProject.set(project);
    host.showPhotosFirst.set(true);
    openEditor();

    const scrolled = scroller.mock.instances
      .filter((instance: HTMLElement) => instance.classList?.contains('photos-section'));
    expect(scrolled).toHaveLength(1);
  });

  it('switches to edit mode, with photos, when the created project lands', () => {
    openEditor();

    expect(dialog().querySelector('.photos-section')).toBeNull();
    switchToSaved();

    expect(dialog().textContent).toContain('Edit project');
    expect(dialog().querySelector('.photos-section app-photo-manager')).not.toBeNull();
  });

  it('emits delete for the advanced action', () => {
    host.editorProject.set(project);
    openEditor();

    dialog().querySelector<HTMLButtonElement>('.editor-advanced .btn-delete')!.click();

    expect(host.deleted).toEqual([project]);
  });
});
