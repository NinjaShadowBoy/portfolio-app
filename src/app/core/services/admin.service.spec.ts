import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminService } from './admin.service';
import { environment } from '../../../environments/environment';

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;
  const api = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only the user filters that are set', () => {
    service.listUsers({ search: '', includeAnonymous: true, offset: 25, limit: undefined }).subscribe();

    const req = http.expectOne((r) => r.url === `${api}/admin/users`);
    expect(req.request.params.keys().sort()).toEqual(['includeAnonymous', 'offset']);
    expect(req.request.params.get('includeAnonymous')).toBe('true');
    req.flush({ items: [], total: 0, limit: 25, offset: 25 });
  });

  it('patches the role with a JSON body', () => {
    service.updateUserRole(8, 'ADMIN').subscribe();

    const req = http.expectOne(`${api}/admin/users/8/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'ADMIN' });
    req.flush({});
  });

  it('filters the moderation feed by type and target', () => {
    service.listComments({ type: 'suggestion', target: 'article' }).subscribe();

    const req = http.expectOne((r) => r.url === `${api}/admin/comments`);
    expect(req.request.params.get('type')).toBe('suggestion');
    expect(req.request.params.get('target')).toBe('article');
    req.flush({ items: [], total: 0, limit: 50, offset: 0 });
  });

  it('uses the existing contact routes for messages', () => {
    service.markMessageReplied(3).subscribe();
    service.deleteMessage(3).subscribe();

    expect(http.expectOne(`${api}/contact/3/replied`).request.method).toBe('PATCH');
    expect(http.expectOne(`${api}/contact/3`).request.method).toBe('DELETE');
  });
});
