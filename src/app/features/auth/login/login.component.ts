import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { OAuthProvider } from '../../../core/interfaces/auth.interface';
import { NotificationService } from '../../../core/services/notification.service';
import {
  SegmentedToggleComponent,
  SegmentedToggleOption,
} from '../../../shared/ui/segmented-toggle/segmented-toggle.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SegmentedToggleComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifier = inject(NotificationService);

  loading = signal(false);
  submitted = signal(false);
  isRegister = signal(false);

  /** Ids kept from the old inline toggle so the existing fr translations still apply. */
  readonly modeOptions: readonly SegmentedToggleOption[] = [
    { value: 'login', label: $localize`:Login mode toggle - login option@@loginToggleLogin:Login` },
    { value: 'register', label: $localize`:Login mode toggle - register option@@loginToggleRegister:Register` },
  ];

  submitState = computed(() => {
    if (this.loading()) return this.isRegister() ? 'creating' : 'signingin';
    return this.isRegister() ? 'create' : 'signin';
  });

  form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    name: [''], // required only in register mode, see setMode()
  });

  onSubmit() {
    this.submitted.set(true);
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    const registering = this.isRegister();
    const { email, password, name } = this.form.getRawValue();
    const action$ = registering
      ? this.auth.register({ email, password, name })
      : this.auth.login({ email, password });

    action$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        this.auth.setSession(res);
        this.notifier.success(
          registering
            ? $localize`:Toast shown after a successful registration@@loginWelcome:Welcome aboard!`
            : $localize`:@@loginWelcomeBack:Welcome back!`
        );
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        const fallback = registering
          ? $localize`:@@registerFailed:Registration failed`
          : $localize`:@@loginFailed:Login failed`;
        this.notifier.error(err?.error?.message || fallback);
      },
    });
  }

  loginWithOAuth2(provider: OAuthProvider) {
    if (!this.loading()) this.auth.startOAuth2(provider);
  }

  setMode(mode: string) {
    const register = mode === 'register';
    if (register === this.isRegister()) return;

    this.isRegister.set(register);
    const nameControl = this.form.controls.name;
    if (register) nameControl.setValidators([Validators.required, Validators.minLength(2)]);
    else nameControl.clearValidators();
    this.form.reset();
    this.submitted.set(false);
  }
}
