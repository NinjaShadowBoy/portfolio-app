import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { authGuard, contactGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let notification: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    isAuthenticated = signal(false);
    notification = jasmine.createSpyObj<NotificationService>('NotificationService', ['error']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated } },
        { provide: NotificationService, useValue: notification },
      ],
    });
  });

  const run = () => TestBed.runInInjectionContext(() => authGuard(route, state));

  it('allows navigation when authenticated', () => {
    isAuthenticated.set(true);
    expect(run()).toBeTrue();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('redirects to /login with an error when not authenticated', () => {
    const result = run() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
    expect(notification.error).toHaveBeenCalled();
  });
});

describe('contactGuard', () => {
  it('delegates to the component', () => {
    const result = contactGuard(
      { canDeactivate: () => false },
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot
    );
    expect(result).toBeFalse();
  });
});
