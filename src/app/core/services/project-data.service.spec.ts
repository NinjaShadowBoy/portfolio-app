import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { ProjectDataService } from './project-data.service';
import { ProjectImport } from '../interfaces/project.interface';

describe('ProjectDataService', () => {
  afterEach(() => vi.useRealTimers());

  let service: ProjectDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ProjectDataService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fall back to hardcoded projects when the API returns an empty list', async () => {
    vi.useFakeTimers();
    const request = httpMock.expectOne((req) => req.url.endsWith('/projects'));
    request.flush([]);

    await vi.advanceTimersByTimeAsync(300);

    expect(service.projects().length).toBeGreaterThan(0);
    expect(service.projects()[0].name).toBe('Lora');
    expect(service.featuredProjects().length).toBeGreaterThan(0);
  });

  it('should fall back to hardcoded projects when the API fails', async () => {
    vi.useFakeTimers();
    const request = httpMock.expectOne((req) => req.url.endsWith('/projects'));
    request.flush('Server error', {
      status: 500,
      statusText: 'Server Error',
    });

    await vi.advanceTimersByTimeAsync(300);

    expect(service.projects().length).toBeGreaterThan(0);
    expect(service.projects()[1].name).toBe('Connect Four');
  });

  it('sends only writable fields when updating an imported project', async () => {
    vi.useFakeTimers();
    httpMock.expectOne((req) => req.url.endsWith('/projects')).flush([]);
    await vi.advanceTimersByTimeAsync(300);
    const imported = { ...service.projects()[0], id: 42, isExpanded: true };
    service.updateProject(imported.id, imported).subscribe();

    const request = httpMock.expectOne((req) => req.method === 'PUT');
    expect(request.request.url.endsWith('/projects/42')).toBe(true);
    expect(JSON.parse(request.request.serializeBody() as string)).toEqual({
      name: imported.name,
      description: imported.description,
      technologies: imported.technologies,
      githubLink: imported.githubLink,
      challenges: imported.challenges,
      whatILearned: imported.whatILearned,
      featured: imported.featured,
    });
    const refresh = vi.spyOn(service, 'refreshProjects').mockImplementation(() => undefined);
    request.flush(imported);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('preserves a false flag and omits unspecified fields in partial updates', async () => {
    vi.useFakeTimers();
    httpMock.expectOne((req) => req.url.endsWith('/projects')).flush([]);
    await vi.advanceTimersByTimeAsync(300);
    service.updateProject(42, { featured: false }).subscribe();
    const request = httpMock.expectOne((req) => req.method === 'PUT');
    expect(JSON.parse(request.request.serializeBody() as string)).toEqual({ featured: false });
    vi.spyOn(service, 'refreshProjects').mockImplementation(() => undefined);
    request.flush({});
  });

  it('omits import IDs on creation and does not refresh on failure', async () => {
    vi.useFakeTimers();
    httpMock.expectOne((req) => req.url.endsWith('/projects')).flush([]);
    await vi.advanceTimersByTimeAsync(300);
    const imported: ProjectImport = { ...service.projects()[0], id: 42 };
    const refresh = vi.spyOn(service, 'refreshProjects').mockImplementation(() => undefined);
    service.createProject(imported).subscribe({ error: () => {} });
    const request = httpMock.expectOne((req) => req.method === 'POST');
    expect(JSON.parse(request.request.serializeBody() as string).id).toBeUndefined();
    request.flush('Server error', { status: 500, statusText: 'Server Error' });
    expect(refresh).not.toHaveBeenCalled();
  });
});
