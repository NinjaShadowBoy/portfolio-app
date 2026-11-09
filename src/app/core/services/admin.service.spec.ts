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

  it('queries chat usage for the requested day range', () => {
    service.getChatUsage(14).subscribe();

    const req = http.expectOne((r) => r.url === `${api}/admin/chat/usage`);
    expect(req.request.params.get('days')).toBe('14');
    req.flush({ days: [], topSubjects: [], today: { requests: 0, tokens: 0, tokenBudget: 0, budgetRemaining: 0 } });
  });

  it('reads the knowledge index state', () => {
    service.getKnowledge().subscribe();

    const req = http.expectOne(`${api}/admin/knowledge`);
    expect(req.request.method).toBe('GET');
    req.flush({ enabled: true, sources: [], lastSync: null, syncing: false });
  });

  it('starts a reindex with an empty POST body', () => {
    service.reindexKnowledge().subscribe();

    const req = http.expectOne(`${api}/admin/knowledge/reindex`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ startedAt: '', finishedAt: '', added: 0, updated: 0, deleted: 0, unchanged: 0, error: null });
  });
});
