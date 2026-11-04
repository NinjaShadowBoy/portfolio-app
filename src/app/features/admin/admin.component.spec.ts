import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AdminComponent } from './admin.component';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDataService } from '../../core/services/project-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project, ProjectCreateRequest } from '../../core/interfaces/project.interface';
import { AdminService } from '../../core/services/admin.service';
import { AdminStats } from '../../core/interfaces/admin.interface';

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let component: AdminComponent;
  let projects: jasmine.SpyObj<ProjectDataService>;
  let notification: jasmine.SpyObj<NotificationService>;
  let admin: jasmine.SpyObj<AdminService>;
  const stats: AdminStats = {
    users: 3, anonymousUsers: 4, admins: 1, projects: 2, comments: 5, ratings: 6, unreadMessages: 1,
  };

  const existing: Project = {
    id: 9,
    name: 'Existing',
    description: 'desc',
    technologies: ['Angular'],
    githubLink: 'https://github.com/x/y',
    challenges: 'c',
    whatILearned: 'w',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: false,
    photoUrls: [],
  };
  const draft: ProjectCreateRequest = {
    name: 'Draft',
    description: 'A new project',
    technologies: ['Go'],
    githubLink: 'https://github.com/x/z',
    challenges: 'c',
    whatILearned: 'w',
    featured: true,
  };

  beforeEach(async () => {
    projects = jasmine.createSpyObj<ProjectDataService>('ProjectDataService', [
      'createProject',
      'updateProject',
      'deleteProject',
    ]);
    (projects as any).projects = signal([existing]);
    projects.createProject.and.returnValue(of({ ...existing, ...draft, id: 10 }));
    projects.updateProject.and.returnValue(of({ ...existing, ...draft }));
    projects.deleteProject.and.returnValue(of(undefined));
    notification = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);
    admin = jasmine.createSpyObj<AdminService>('AdminService', ['getStats']);
    admin.getStats.and.returnValue(of(stats));

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ name: 'Ann', email: 'a@b.c' }), isAdmin: signal(true) } },
        { provide: ProjectDataService, useValue: projects },
        { provide: NotificationService, useValue: notification },
        { provide: AdminService, useValue: admin },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens on the overview and shows the admin counts', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.tab()).toBe('overview');
    expect(admin.getStats).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.stat-grid')?.textContent).toContain('Unread messages');
  });

  it('switches sections and shows the project list only on the projects tab', async () => {
    expect(fixture.nativeElement.querySelector('.projects-list')).toBeNull();

    component.selectTab('projects');
    fixture.detectChanges();
    expect(component.tab()).toBe('projects');
    expect(fixture.nativeElement.querySelector('.projects-list')).not.toBeNull();

    component.selectTab('not-a-tab');
    expect(component.tab()).toBe('overview');
  });

  it('creates a project when nothing is being edited', () => {
    component.onSaveProject(draft);

    expect(projects.createProject).toHaveBeenCalledWith(jasmine.objectContaining(draft));
    expect(projects.updateProject).not.toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('updates the edited project, then returns the form to create mode', () => {
    component.editProject(existing);
    expect(component.formMode()).toBe('edit');

    component.onSaveProject(draft);

    expect(projects.updateProject).toHaveBeenCalledWith(9, jasmine.objectContaining(draft));
    expect(component.formMode()).toBe('create');
    expect(component.editingProject()).toBeNull();
  });

  it('keeps the form open and reports the failure when saving fails', () => {
    spyOn(console, 'error');
    projects.createProject.and.returnValue(throwError(() => new Error('500')));

    component.onSaveProject(draft);

    expect(notification.error).toHaveBeenCalled();
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('routes JSON imports by id: records with an id update, the rest create', () => {
    component.onJsonImport([{ ...draft, id: 9 }, draft]);

    expect(projects.updateProject).toHaveBeenCalledWith(9, jasmine.objectContaining({ id: 9 }));
    expect(projects.createProject).toHaveBeenCalledWith(draft);
    expect(notification.success).toHaveBeenCalledTimes(1);
  });

  it('deletes only after confirmation and clears the form if that project was being edited', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    component.deleteProject(existing);
    expect(projects.deleteProject).not.toHaveBeenCalled();

    confirmSpy.and.returnValue(true);
    component.editProject(existing);
    component.deleteProject(existing);

    expect(projects.deleteProject).toHaveBeenCalledWith(9);
    expect(component.editingProject()).toBeNull();
  });
});
