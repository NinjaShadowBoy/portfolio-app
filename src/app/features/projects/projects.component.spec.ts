import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ProjectsComponent } from './projects.component';
import { Project } from '../../core/interfaces/project.interface';

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    name: 'Project',
    description: 'desc',
    technologies: [],
    githubLink: 'https://github.com/',
    challenges: '',
    whatILearned: '',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: false,
    photoUrls: [],
    ...overrides,
  };
}

/** Drives the real ProjectDataService with a stubbed API to prove filtering end to end. */
describe('ProjectsComponent', () => {
  let fixture: ComponentFixture<ProjectsComponent>;
  let component: ProjectsComponent;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const cardNames = () =>
    Array.from(el().querySelectorAll('app-project-card h3')).map((h) => h.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  function loadProjects(): void {
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/projects')).flush([
      makeProject({ id: 1, name: 'Alpha Shop', technologies: ['Angular'], featured: true }),
      makeProject({ id: 2, name: 'Beta Board', description: 'a kanban board', technologies: ['React'] }),
    ]);
    tick(300);
    fixture.detectChanges();
  }

  it('shows the loading state until the API responds, then one card per project', fakeAsync(() => {
    fixture.detectChanges();
    expect(el().querySelector('.loading-spinner')).toBeTruthy();

    http.expectOne((req) => req.url.endsWith('/projects')).flush([makeProject({ id: 1, name: 'Only' })]);
    tick(300);
    fixture.detectChanges();

    expect(el().querySelector('.loading-spinner')).toBeNull();
    expect(cardNames()).toEqual(['Only']);
  }));

  it('filters by search term across name and description', fakeAsync(() => {
    loadProjects();
    component.updateFilters({ searchTerm: 'kanban' });
    fixture.detectChanges();

    expect(cardNames()).toEqual(['Beta Board']);
  }));

  it('filters by technology and featured flag, and offers the technologies as options', fakeAsync(() => {
    loadProjects();
    const options = Array.from(el().querySelectorAll('#technology option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['All Technologies', 'Angular', 'React']);

    component.updateFilters({ technology: 'React' });
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Beta Board']);

    component.updateFilters({ technology: '', featured: true });
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Alpha Shop']);
  }));

  it('shows the empty state and restores everything on reset', fakeAsync(() => {
    loadProjects();
    component.updateFilters({ searchTerm: 'zzz' });
    fixture.detectChanges();
    expect(el().querySelector('.no-results')).toBeTruthy();

    (el().querySelector('.no-results .reset-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.filters()).toEqual({ searchTerm: '', technology: '', featured: false });
    expect(cardNames()).toEqual(['Alpha Shop', 'Beta Board']);
  }));
});
