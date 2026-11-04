import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './auth.service';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

/** Unsigned JWT with the given claims; only the payload segment is decoded. */
function fakeJwt(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('AuthService', () => {
  let notification: jasmine.SpyObj<NotificationService>;

  function setup(): AuthService {
    notification = jasmine.createSpyObj<NotificationService>('NotificationService', ['success']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification },
      ],
    });
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('restores a stored session on creation', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 1, name: 'Ann', role: 'ADMIN' }));

    const service = setup();

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.isAdmin()).toBeTrue();
    expect(service.user()?.name).toBe('Ann');
  });

  it('ignores a corrupt stored user', () => {
    localStorage.setItem(USER_STORAGE_KEY, '{not json');
    expect(setup().user()).toBeNull();
  });

  it('builds the session from a JWT and persists it', () => {
    const service = setup();
    const token = fakeJwt({ sub: 'ann@example.com', userId: 7, roles: ['USER', 'ADMIN'], iat: 1_700_000_000 });

    const response = service.setSessionFromToken(token);
    TestBed.tick(); // flush the persistence effects

    expect(response.user).toEqual(
      jasmine.objectContaining({ id: 7, email: 'ann@example.com', name: 'ann', role: 'ADMIN' })
    );
    expect(response.user.createdAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(service.isAdmin()).toBeTrue();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(token);
    expect(JSON.parse(localStorage.getItem(USER_STORAGE_KEY)!).email).toBe('ann@example.com');
  });

  it('defaults to the USER role and rejects a malformed token', () => {
    const service = setup();

    expect(service.setSessionFromToken(fakeJwt({ sub: '5', name: 'Bob' })).user.role).toBe('USER');
    expect(() => service.setSessionFromToken('not-a-jwt')).toThrowError('Failed to decode token');
  });

  it('logout clears the session, storage and notifies', () => {
    const service = setup();
    service.setSessionFromToken(fakeJwt({ sub: 'a@b.c' }));
    TestBed.tick();

    service.logout();
    TestBed.tick();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    expect(notification.success).toHaveBeenCalled();
  });

  it('updateUser merges a patch into the current user only when logged in', () => {
    const service = setup();
    service.updateUser({ name: 'Nobody' });
    expect(service.user()).toBeNull();

    service.setSessionFromToken(fakeJwt({ sub: 'a@b.c', name: 'Ann' }));
    service.updateUser({ name: 'Annie' });
    expect(service.user()).toEqual(jasmine.objectContaining({ email: 'a@b.c', name: 'Annie' }));
  });

  it('maps a 202 device poll to a pending result and a 200 to the login response', () => {
    const service = setup();
    const http = TestBed.inject(HttpTestingController);
    const results: unknown[] = [];

    service.pollGitHubDevice('dev-1').subscribe((r) => results.push(r));
    const pending = http.expectOne(`${environment.apiBaseUrl}/auth/github/device/token`);
    expect(pending.request.body).toEqual({ deviceCode: 'dev-1' });
    pending.flush(null, { status: 202, statusText: 'Accepted' });

    service.pollGitHubDevice('dev-1').subscribe((r) => results.push(r));
    const login = { token: 't', user: { id: 1 }, expiresIn: 10 };
    http.expectOne(`${environment.apiBaseUrl}/auth/github/device/token`).flush(login);

    expect(results).toEqual([{ status: 'pending' }, login]);
    http.verify();
  });
});
