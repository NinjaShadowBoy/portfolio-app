import { Mocked, Mock } from 'vitest';
import { createSpyObj } from '../../../../testing/create-spy-obj';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoginResponse } from '../../../core/interfaces/auth.interface';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: Mocked<AuthService>;
  let notifier: Mocked<NotificationService>;
  let navigate: Mock;

  const response = { token: 't', user: { id: 1, name: 'Ann' }, expiresIn: 1 } as LoginResponse;

  beforeEach(async () => {
    auth = createSpyObj<AuthService>(['login', 'register', 'setSession', 'startOAuth2']);
    notifier = createSpyObj<NotificationService>(['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifier },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('signs in with email and password, stores the session and goes home', () => {
    auth.login.mockReturnValue(of(response));
    component.form.setValue({ email: 'ann@example.com', password: 'secret', name: '' });

    component.onSubmit();

    expect(auth.login).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'secret' });
    expect(auth.setSession).toHaveBeenCalledWith(response);
    expect(navigate).toHaveBeenCalledWith('/home');
    expect(component.loading()).toBe(false);
  });

  it('does not call the API with an invalid form', () => {
    component.form.setValue({ email: 'nope', password: '', name: '' });
    component.onSubmit();

    expect(component.submitted()).toBe(true);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('requires a name in register mode and registers with it', () => {
    auth.register.mockReturnValue(of(response));
    component.setMode('register');
    component.form.setValue({ email: 'ann@example.com', password: 'secret', name: '' });
    component.onSubmit();
    expect(auth.register).not.toHaveBeenCalled();

    component.form.controls.name.setValue('Ann');
    component.onSubmit();
    expect(auth.register).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'secret', name: 'Ann' });
  });

  it('shows the server message on failure and re-enables the form', () => {
    auth.login.mockReturnValue(throwError(() => ({ error: { message: 'Bad credentials' } })));
    component.form.setValue({ email: 'ann@example.com', password: 'wrong', name: '' });

    component.onSubmit();

    expect(notifier.error).toHaveBeenCalledWith('Bad credentials');
    expect(component.loading()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('switching mode clears the form and the submitted flag', () => {
    component.form.setValue({ email: 'x', password: 'y', name: '' });
    component.onSubmit();
    expect(component.submitted()).toBe(true);

    component.setMode('register');

    expect(component.isRegister()).toBe(true);
    expect(component.submitted()).toBe(false);
    expect(component.form.getRawValue()).toEqual({ email: '', password: '', name: '' });
  });
});
