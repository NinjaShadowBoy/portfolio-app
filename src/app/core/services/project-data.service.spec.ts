import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { ProjectDataService } from './project-data.service';
import { ProjectImport } from '../interfaces/project.interface';

describe('ProjectDataService', () => {
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

  it('should fall back to hardcoded projects when the API returns an empty list', fakeAsync(() => {
    const request = httpMock.expectOne((req) => req.url.endsWith('/projects'));
    request.flush([]);

    tick(300);

    expect(service.projects().length).toBeGreaterThan(0);
    expect(service.projects()[0].name).toBe('Lora');
    expect(service.featuredProjects().length).toBeGreaterThan(0);
  }));

  it('should fall back to hardcoded projects when the API fails', fakeAsync(() => {
    const request = httpMock.expectOne((req) => req.url.endsWith('/projects'));
    request.flush('Server error', {
      status: 500,
      statusText: 'Server Error',
    });

    tick(300);

    expect(service.projects().length).toBeGreaterThan(0);
    expect(service.projects()[1].name).toBe('Connect Four');
  }));

  it('sends only writable fields when updating an imported project', fakeAsync(() => {
    httpMock.expectOne((req) => req.url.endsWith('/projects')).flush([]);
    tick(300);
    const imported = { ...service.projects()[0], id: 42, isExpanded: true };
    service.updateProject(imported.id, imported).subscribe();

    const request = httpMock.expectOne((req) => req.method === 'PUT');
    expect(request.request.url.endsWith('/projects/42')).toBeTrue();
    expect(JSON.parse(request.request.serializeBody() as string)).toEqual({
      name: imported.name,
      description: imported.description,
      technologies: imported.technologies,
      githubLink: imported.githubLink,
      challenges: imported.challenges,
      whatILearned: imported.whatILearned,
      featured: imported.featured,
    });
    const refresh = spyOn(service, 'refreshProjects');
    request.flush(imported);
    expect(refresh).toHaveBeenCalledTimes(1);
  }));

  it('preserves a false flag and omits unspecified fields in partial updates', fakeAsync(() => {
    httpMock.expectOne((req) => req.url.endsWith('/projects')).flush([]);
    tick(300);
    service.updateProject(42, { featured: false }).subscribe();
    const request = httpMock.expectOne((req) => req.method === 'PUT');
    expect(JSON.parse(request.request.serializeBody() as string)).toEqual({ featured: false });
    spyOn(service, 'refreshProjects');
    request.flush({});
  }));

  it('omits import IDs on creation and does not refresh on failure', fakeAsync(() => {
    httpMock.expectOne((req) => req.url.endsWith('/projects')).flush([]);
    tick(300);
    const imported: ProjectImport = { ...service.projects()[0], id: 42 };
    const refresh = spyOn(service, 'refreshProjects');
    service.createProject(imported).subscribe({ error: () => {} });
    const request = httpMock.expectOne((req) => req.method === 'POST');
    expect(JSON.parse(request.request.serializeBody() as string).id).toBeUndefined();
    request.flush('Server error', { status: 500, statusText: 'Server Error' });
    expect(refresh).not.toHaveBeenCalled();
  }));
});
