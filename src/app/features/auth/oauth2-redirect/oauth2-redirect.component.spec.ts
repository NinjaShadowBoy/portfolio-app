import { Mocked, Mock } from 'vitest';
import { createSpyObj } from '../../../../testing/create-spy-obj';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { Oauth2RedirectComponent } from './oauth2-redirect.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('Oauth2RedirectComponent', () => {
  afterEach(() => vi.useRealTimers());

  let fixture: ComponentFixture<Oauth2RedirectComponent>;
  let auth: Mocked<AuthService>;
  let notifier: Mocked<NotificationService>;
  let navigate: Mock;

  function setup(queryParams: Record<string, string>, { decodeFails = false } = {}): void {
    auth = createSpyObj<AuthService>(['setSessionFromToken']);
    if (decodeFails) auth.setSessionFromToken.mockImplementation(() => {
      throw new Error('Failed to decode token');
    });
    notifier = createSpyObj<NotificationService>(['success', 'error']);
    navigate = vi.fn().mockName('navigateByUrl');
    TestBed.configureTestingModule({
      imports: [Oauth2RedirectComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
        { provide: Router, useValue: { navigateByUrl: navigate } },
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifier },
      ],
    });
    fixture = TestBed.createComponent(Oauth2RedirectComponent);
    fixture.detectChanges();
  }

  it('stores the session from the token and redirects home after a second', () => {
    vi.useFakeTimers();
    setup({ token: 'jwt' });

    expect(auth.setSessionFromToken).toHaveBeenCalledWith('jwt');
    expect(notifier.success).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('reports a provider error and sends the user back to login', () => {
    vi.useFakeTimers();
    setup({ error: 'access_denied' });

    expect(notifier.error).toHaveBeenCalledWith('access_denied');
    expect(fixture.nativeElement.textContent).toContain('Authentication failed');
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('treats a callback without a token as a failure', () => {
    vi.useFakeTimers();
    setup({ other: 'x' });

    expect(notifier.error).toHaveBeenCalledTimes(1);
    expect(auth.setSessionFromToken).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('treats an undecodable token as a failure', () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setup({ token: 'garbage' }, { decodeFails: true });

    expect(notifier.error).toHaveBeenCalledTimes(1);
    expect(notifier.success).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
