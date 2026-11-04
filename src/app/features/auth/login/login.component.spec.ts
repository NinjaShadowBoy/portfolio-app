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
  let auth: jasmine.SpyObj<AuthService>;
  let notifier: jasmine.SpyObj<NotificationService>;
  let navigate: jasmine.Spy;

  const response = { token: 't', user: { id: 1, name: 'Ann' }, expiresIn: 1 } as LoginResponse;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'register', 'setSession', 'startOAuth2']);
    notifier = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifier },
      ],
    }).compileComponents();
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('signs in with email and password, stores the session and goes home', () => {
    auth.login.and.returnValue(of(response));
    component.form.setValue({ email: 'ann@example.com', password: 'secret', name: '' });

    component.onSubmit();

    expect(auth.login).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'secret' });
    expect(auth.setSession).toHaveBeenCalledWith(response);
    expect(navigate).toHaveBeenCalledWith('/home');
    expect(component.loading()).toBeFalse();
  });

  it('does not call the API with an invalid form', () => {
    component.form.setValue({ email: 'nope', password: '', name: '' });
    component.onSubmit();

    expect(component.submitted()).toBeTrue();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('requires a name in register mode and registers with it', () => {
    auth.register.and.returnValue(of(response));
    component.setMode('register');
    component.form.setValue({ email: 'ann@example.com', password: 'secret', name: '' });
    component.onSubmit();
    expect(auth.register).not.toHaveBeenCalled();

    component.form.controls.name.setValue('Ann');
    component.onSubmit();
    expect(auth.register).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'secret', name: 'Ann' });
  });

  it('shows the server message on failure and re-enables the form', () => {
    auth.login.and.returnValue(throwError(() => ({ error: { message: 'Bad credentials' } })));
    component.form.setValue({ email: 'ann@example.com', password: 'wrong', name: '' });

    component.onSubmit();

    expect(notifier.error).toHaveBeenCalledWith('Bad credentials');
    expect(component.loading()).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('switching mode clears the form and the submitted flag', () => {
    component.form.setValue({ email: 'x', password: 'y', name: '' });
    component.onSubmit();
    expect(component.submitted()).toBeTrue();

    component.setMode('register');

    expect(component.isRegister()).toBeTrue();
    expect(component.submitted()).toBeFalse();
    expect(component.form.getRawValue()).toEqual({ email: '', password: '', name: '' });
  });
});
