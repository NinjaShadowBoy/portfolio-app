import { Mocked } from 'vitest';
import { createSpyObj } from '../../../testing/create-spy-obj';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AdminComponent } from './admin.component';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDataService } from '../../core/services/project-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { PhotoService } from '../../core/services/photo.service';
import { DEFERRED_DELETE_MS } from '../../core/utils/deferred-action';
import { Project, ProjectCreateRequest } from '../../core/interfaces/project.interface';
import { AdminService } from '../../core/services/admin.service';
import { AdminStats, ChatUsage, KnowledgeIndex } from '../../core/interfaces/admin.interface';
import { ProjectFormComponent } from './components/project-form/project-form.component';

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let component: AdminComponent;
  let projects: Mocked<ProjectDataService>;
  let list: ReturnType<typeof signal<Project[]>>;
  let notification: Mocked<NotificationService>;
  let admin: Mocked<AdminService>;
  let confirm: { ask: ReturnType<typeof vi.fn> };
  const stats: AdminStats = {
    users: 3, anonymousUsers: 4, admins: 1, projects: 2, comments: 5, ratings: 6, unreadMessages: 1,
  };
  const chatUsage: ChatUsage = {
    days: [{ day: '2026-11-09', requests: 3, inputTokens: 180, outputTokens: 130 }],
    topSubjects: [],
    today: { requests: 3, tokens: 310, tokenBudget: 2000000, budgetRemaining: 1999690 },
  };
  const knowledge: KnowledgeIndex = { enabled: true, sources: [], lastSync: null, syncing: false };

  const existing: Project = {
    id: 9,
    name: 'Existing',
    description: 'desc that is long enough',
    technologies: ['Angular'],
    githubLink: 'https://github.com/x/y',
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
  const other: Project = { ...existing, id: 11, name: 'Other' };
  const draft: ProjectCreateRequest = {
    name: 'Draft',
    description: 'A new project',
    technologies: ['Go'],
    githubLink: 'https://github.com/x/z',
    challenges: 'c',
    whatILearned: 'w',
    featured: true,
  };

  const dialog = (): HTMLDialogElement =>
    fixture.nativeElement.querySelector('app-project-editor dialog');
  const editorPanel = (): HTMLElement => fixture.nativeElement.querySelector('app-project-editor');
  const form = () => fixture.debugElement.query((de) => de.componentInstance instanceof ProjectFormComponent)
    ?.componentInstance as ProjectFormComponent;
  const openProjectsTab = async () => {
    await component.selectTab('projects');
    fixture.detectChanges();
  };

  beforeEach(async () => {
    list = signal([existing, other]);
    projects = createSpyObj<ProjectDataService>(['createProject', 'updateProject', 'deleteProject']);
    (projects as any).projects = list;
    // Like the real service, a save shows in the list at once.
    projects.createProject.mockImplementation((data) => {
      const created = { ...existing, ...data, id: 10 } as Project;
      list.update((items) => [...items, created]);
      return of(created);
    });
    projects.updateProject.mockImplementation((id, data) => {
      const saved = { ...list().find((p) => p.id === id)!, ...data } as Project;
      list.update((items) => items.map((p) => (p.id === id ? saved : p)));
      return of(saved);
    });
    projects.deleteProject.mockReturnValue(of(undefined));
    notification = createSpyObj<NotificationService>(['success', 'error', 'show', 'dismiss']);
    notification.show.mockReturnValue('toast');
    admin = createSpyObj<AdminService>(['getStats', 'getChatUsage', 'getKnowledge']);
    admin.getStats.mockReturnValue(of(stats));
    admin.getChatUsage.mockReturnValue(of(chatUsage));
    admin.getKnowledge.mockReturnValue(of(knowledge));
    confirm = { ask: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ name: 'Ann', email: 'a@b.c' }), isAdmin: signal(true) } },
        { provide: ProjectDataService, useValue: projects },
        { provide: NotificationService, useValue: notification },
        { provide: AdminService, useValue: admin },
        { provide: ConfirmService, useValue: confirm },
        { provide: PhotoService, useValue: createSpyObj<PhotoService>(['uploadProjectPhoto', 'deletePhoto']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => vi.useRealTimers());

  it('opens on the overview and shows the admin counts', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.tab()).toBe('overview');
    expect(admin.getStats).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.stat-grid')?.textContent).toContain('Unread messages');
  });

  it('switches sections and shows the projects tab only there', async () => {
    expect(fixture.nativeElement.querySelector('.projects-toolbar')).toBeNull();

    await openProjectsTab();
    expect(component.tab()).toBe('projects');
    expect(fixture.nativeElement.querySelector('.projects-toolbar')).not.toBeNull();

    await component.selectTab('not-a-tab');
    expect(component.tab()).toBe('overview');
  });

  it('shows the Assistant tab with its panel and URL state', async () => {
    await component.selectTab('assistant');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.tab()).toBe('assistant');
    expect(fixture.nativeElement.querySelector('app-assistant-panel')).not.toBeNull();
    expect(TestBed.inject(Router).url).toContain('tab=assistant');
    expect(admin.getChatUsage).toHaveBeenCalledWith(14);
    expect(admin.getKnowledge).toHaveBeenCalled();
  });

  it('counts assistant messages on the overview and links the card to the Assistant tab', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const card: HTMLButtonElement = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.stat-card'),
    ).find((el) => el.textContent?.includes('Assistant messages today'))!;
    expect(card).toBeTruthy();
    expect(card.querySelector('.stat-value')!.textContent).toContain('3');

    card.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.tab()).toBe('assistant');
  });

  it('hides the assistant card instead of failing when the usage request does', async () => {
    admin.getChatUsage.mockReturnValue(throwError(() => new Error('down')));
    const failing = TestBed.createComponent(AdminComponent);
    failing.detectChanges();
    await failing.whenStable();
    failing.detectChanges();

    const labels = Array.from(
      (failing.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('span.stat-label'),
    ).map((el) => el.textContent?.trim());
    expect(labels).not.toContain('Assistant messages today');
    expect(labels).toContain('Unread messages');
  });

  it('shows a toolbar with New project and Import JSON instead of the mode toggle', async () => {
    await openProjectsTab();

    expect(fixture.nativeElement.querySelector('.mode-toggle')).toBeNull();
    expect(fixture.nativeElement.querySelector('.project-form')).toBeNull();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.projects-toolbar button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['New project', 'Import JSON']);
    expect(buttons[0].classList.contains('btn-primary')).toBe(true);
    expect(buttons[1].classList.contains('btn-secondary')).toBe(true);
  });

  it('lists projects in a table whose row actions open the editor and delete with Undo', async () => {
    vi.useFakeTimers();
    await openProjectsTab();

    const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('app-projects-list tbody tr[data-row]'));
    const row = rows()[0];
    expect(row.textContent).toContain('Existing');
    const button = (label: string) =>
      Array.from(row.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;

    button('Edit').click();
    await Promise.resolve();
    fixture.detectChanges();
    expect(component.editorParam()).toBe(9);
    expect(component.editorProject()).toEqual(existing);
    expect(dialog()?.open).toBe(true);

    button('Delete').click();
    fixture.detectChanges();
    expect(rows().some((r) => r.textContent?.includes('Existing'))).toBe(false);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted "Existing".' }));
    expect(projects.deleteProject).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DEFERRED_DELETE_MS);
    expect(projects.deleteProject).toHaveBeenCalledWith(9);
  });

  it('puts a deleted project back on Undo and never deletes it', async () => {
    vi.useFakeTimers();
    component.deleteProject(existing);
    expect(component.visibleProjects().map((p) => p.id)).toEqual([11]);

    notification.show.mock.calls[0][0].actions![0].action();

    expect(component.visibleProjects().map((p) => p.id)).toEqual([9, 11]);
    vi.advanceTimersByTime(DEFERRED_DELETE_MS);
    expect(projects.deleteProject).not.toHaveBeenCalled();
  });

  it('puts the project back and reports it when the delete fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    projects.deleteProject.mockReturnValue(throwError(() => new Error('500')));

    component.deleteProject(existing);
    vi.advanceTimersByTime(DEFERRED_DELETE_MS);

    expect(component.visibleProjects().map((p) => p.id)).toEqual([9, 11]);
    expect(notification.error).toHaveBeenCalledWith('Could not delete "Existing". It is back in the list.');
  });

  it('commits a pending delete when the page is left', () => {
    component.deleteProject(existing);
    fixture.destroy();
    expect(projects.deleteProject).toHaveBeenCalledWith(9);
  });

  it('creates a project from the editor and keeps the dialog open on the new project', async () => {
    await openProjectsTab();
    await component.startNewProject();
    fixture.detectChanges();
    expect(component.editorParam()).toBe('new');
    expect(component.editorProject()).toBeNull();

    component.onSaveProject(draft);
    await Promise.resolve();
    fixture.detectChanges();

    expect(projects.createProject).toHaveBeenCalledWith(expect.objectContaining(draft));
    expect(projects.updateProject).not.toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
    expect(component.editorParam()).toBe(10);
    expect(component.editorProject()?.name).toBe('Draft');
    expect(form().formMode()).toBe('edit');
    expect(form().projectForm.getRawValue().name).toBe('Draft');
    expect(form().dirty()).toBe(false);
    expect(component.saveStatus()).toBe('saved');
    expect(fixture.nativeElement.querySelector('.save-status')?.textContent).toContain('Saved');
  });

  it('keeps the editor open with the saved values after an update', async () => {
    await openProjectsTab();
    await component.editProject(existing);
    fixture.detectChanges();
    form().projectForm.controls.name.setValue('Renamed');
    form().projectForm.markAsDirty();
    expect(form().dirty()).toBe(true);

    form().submitForm();
    await Promise.resolve();
    fixture.detectChanges();

    expect(projects.updateProject).toHaveBeenCalledWith(9, expect.objectContaining({ name: 'Renamed' }));
    expect(component.editorProject()?.name).toBe('Renamed');
    expect(form().projectForm.getRawValue().name).toBe('Renamed');
    expect(form().dirty()).toBe(false);
    expect(component.saveStatus()).toBe('saved');
    expect(fixture.nativeElement.querySelector('.save-status')?.textContent).toContain('Saved');
  });

  it('keeps the editor open and reports the failure when saving fails', async () => {
    await openProjectsTab();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    projects.createProject.mockReturnValue(throwError(() => new Error('500')));

    component.onSaveProject(draft);
    await Promise.resolve();

    expect(notification.error).toHaveBeenCalled();
    expect(notification.success).not.toHaveBeenCalled();
    expect(component.saveStatus()).toBe('error');
  });

  it('closes the editor when the project being edited is deleted', async () => {
    await component.editProject(existing);
    component.deleteProject(existing);
    await Promise.resolve();
    fixture.detectChanges();
    expect(component.editorOpen()).toBe(false);
    expect(editorPanel()).toBeNull();
  });

  it('routes JSON imports by id: records with an id update, the rest create', () => {
    component.onJsonImport([{ ...draft, id: 9 }, draft]);

    expect(projects.updateProject).toHaveBeenCalledWith(9, expect.objectContaining({ id: 9 }));
    expect(projects.createProject).toHaveBeenCalledWith(draft);
    expect(notification.success).toHaveBeenCalledTimes(1);
  });

  it('opens the JSON import in its own small dialog and closes it again', async () => {
    await openProjectsTab();

    await component.openJsonImport();
    fixture.detectChanges();
    const jsonDialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog.json-dialog');
    expect(jsonDialog).not.toBeNull();
    expect(jsonDialog.open).toBe(true);
    expect(jsonDialog.querySelector('app-json-import')).not.toBeNull();

    jsonDialog
      .querySelector<HTMLButtonElement>('.btn-close')!
      .click();
    expect(component.jsonOpen()).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog.json-dialog')).toBeNull();
  });

  describe('editor URL state', () => {
    const router = () => TestBed.inject(Router);
    const route = () => TestBed.inject(ActivatedRoute);

    it('reopens the editor from ?project= in a fresh instance', async () => {
      await router().navigate([], {
        relativeTo: route(),
        queryParams: { tab: 'projects', project: String(existing.id) },
      });

      const reloaded = TestBed.createComponent(AdminComponent);
      reloaded.detectChanges();
      expect(reloaded.componentInstance.editorOpen()).toBe(true);
      expect(reloaded.componentInstance.editorProject()?.id).toBe(9);
      expect(reloaded.nativeElement.querySelector('app-project-editor dialog')?.open).toBe(true);
    });

    it('ignores an unknown ?project= id', async () => {
      await openProjectsTab();
      await router().navigate([], { relativeTo: route(), queryParams: { project: '999' } });
      fixture.detectChanges();
      expect(component.editorOpen()).toBe(false);
      expect(editorPanel()).toBeNull();
    });

    it('removes ?project= from the URL when the editor closes', async () => {
      await openProjectsTab();
      await component.editProject(existing);
      fixture.detectChanges();
      expect(dialog()?.open).toBe(true);

      await component.closeEditor();
      fixture.detectChanges();

      expect(component.editorOpen()).toBe(false);
      expect(TestBed.inject(Router).url).not.toContain('project=');
    });

    it('reopens the new-project editor from ?project=new', async () => {
      await router().navigate([], {
        relativeTo: route(),
        queryParams: { project: 'new' },
      });

      const reloaded = TestBed.createComponent(AdminComponent);
      reloaded.detectChanges();
      expect(reloaded.componentInstance.editorParam()).toBe('new');
      expect(reloaded.componentInstance.editorOpen()).toBe(true);
      expect(reloaded.componentInstance.editorProject()).toBeNull();
    });
  });

  describe('with unsaved edits', () => {
    beforeEach(async () => {
      await openProjectsTab();
      await component.editProject(existing);
      fixture.detectChanges();
      form().projectForm.controls.name.setValue('Unsaved name');
      form().projectForm.markAsDirty();
    });

    it('asks before switching to another project, and stays when told to', async () => {
      confirm.ask.mockResolvedValue(false);
      await component.editProject(other);

      expect(confirm.ask).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger', title: 'Discard unsaved changes?' }));
      expect(component.editorParam()).toBe(9);

      confirm.ask.mockResolvedValue(true);
      await component.editProject(other);
      expect(component.editorParam()).toBe(11);
    });

    it('asks before leaving the projects tab', async () => {
      confirm.ask.mockResolvedValue(false);
      await component.selectTab('users');
      expect(component.tab()).toBe('projects');
    });

    it('asks before leaving /admin', async () => {
      confirm.ask.mockResolvedValue(false);
      await expect(component.canDeactivate()).resolves.toBe(false);
    });

    it('asks the browser to confirm a reload', () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it('leaves /admin without asking when nothing is unsaved', async () => {
    await openProjectsTab();
    expect(component.canDeactivate()).toBe(true);
    expect(confirm.ask).not.toHaveBeenCalled();
  });

  it('shows photo changes in the open editor without reopening it', async () => {
    await component.editProjectPhotos(existing);
    fixture.detectChanges();
    const photo = { id: 1, photoUrl: 'https://cdn/new.png', projectId: 9, displayOrder: 0 };

    list.update((items) => items.map((p) => (p.id === 9 ? { ...p, photos: [photo], photoUrls: [photo.photoUrl] } : p)));
    fixture.detectChanges();

    expect(component.editorProject()?.photos).toEqual([photo]);
    expect(dialog()?.querySelector('app-photo-manager .photo-item')).not.toBeNull();
  });
});
