import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    demoLink: null,
    challenges: '',
    whatILearned: '',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: false,
    displayOrder: 0,
    photoUrls: [],
    ...overrides,
  };
}

/** Drives the real ProjectDataService with a stubbed API to prove filtering end to end. */
describe('ProjectsComponent', () => {
  afterEach(() => vi.useRealTimers());

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

  async function loadProjects(): Promise<void> {
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/projects')).flush([
      makeProject({ id: 1, name: 'Alpha Shop', technologies: ['Angular'], featured: true }),
      makeProject({ id: 2, name: 'Beta Board', description: 'a kanban board', technologies: ['React'] }),
    ]);
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
  }

  it('shows the loading state until the API responds, then one card per project', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    expect(el().querySelector('.loading-spinner')).toBeTruthy();

    http.expectOne((req) => req.url.endsWith('/projects')).flush([makeProject({ id: 1, name: 'Only' })]);
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(el().querySelector('.loading-spinner')).toBeNull();
    expect(cardNames()).toEqual(['Only']);
  });

  it('filters by search term across name, description and technologies', async () => {
    vi.useFakeTimers();
    await loadProjects();
    component.updateFilters({ searchTerm: 'kanban' });
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Beta Board']);

    component.updateFilters({ searchTerm: 'angul' });
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Alpha Shop']);
  });

  it('offers each technology as a chip that toggles the filter', async () => {
    vi.useFakeTimers();
    await loadProjects();
    const chips = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.tech-chip'));
    expect(chips().map((c) => c.firstChild?.textContent?.trim())).toEqual(['Angular', 'React']);

    chips()[1].click();
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Beta Board']);
    expect(chips()[1].getAttribute('aria-pressed')).toBe('true');

    chips()[1].click();
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Alpha Shop', 'Beta Board']);
  });

  it('switches between all and featured projects and reports the count', async () => {
    vi.useFakeTimers();
    await loadProjects();
    expect(el().querySelector('.result-line p')?.textContent?.trim()).toBe('2 projects');

    const [all, featured] = Array.from(el().querySelectorAll<HTMLButtonElement>('.scope-btn'));
    featured.click();
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Alpha Shop']);
    expect(el().querySelector('.result-line p')?.textContent?.trim()).toBe('Showing 1 of 2');

    all.click();
    fixture.detectChanges();
    expect(cardNames()).toEqual(['Alpha Shop', 'Beta Board']);
  });

  it('shows the empty state and restores everything on reset', async () => {
    vi.useFakeTimers();
    await loadProjects();
    component.updateFilters({ searchTerm: 'zzz' });
    fixture.detectChanges();
    expect(el().querySelector('.no-results')).toBeTruthy();

    (el().querySelector('.no-results .reset-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.filters()).toEqual({ searchTerm: '', technology: '', featured: false });
    expect(cardNames()).toEqual(['Alpha Shop', 'Beta Board']);
    expect(el().querySelector('.clear-filters')).toBeNull();
  });
});
