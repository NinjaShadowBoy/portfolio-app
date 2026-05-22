import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { ProjectDataService } from './project-data.service';

describe('ProjectDataService', () => {
  let service: ProjectDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ProjectDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
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
    expect(service.projects()[1].name).toBe('Hive Check');
  }));
});
