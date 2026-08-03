
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    SegmentedToggleComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifier = inject(NotificationService);

  loading = signal(false);
  submitted = signal(false);
  isRegister = signal(false);

  /** Options for the login/register segmented toggle (ids kept from the old
   *  inline toggle so the existing fr translations still apply). */
  readonly modeOptions: readonly SegmentedToggleOption[] = [
    {
      value: 'login',
      label: $localize`:Login mode toggle - login option@@loginToggleLogin:Login`,
    },
    {
      value: 'register',
      label: $localize`:Login mode toggle - register option@@loginToggleRegister:Register`,
    },
  ];

  submitState = computed(() => {
    if (this.loading()) return this.isRegister() ? 'creating' : 'signingin';
    return this.isRegister() ? 'create' : 'signin';
  });

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    name: [''],
  });

  onSubmit() {
    this.submitted.set(true);
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const isRegistering = this.isRegister();
    const action$ = isRegistering
      ? this.auth.register({
          email: this.form.value.email!,
          password: this.form.value.password!,
          name: this.form.value.name || '',
        })
      : this.auth.login({
          email: this.form.value.email!,
          password: this.form.value.password!,
        });

    action$.subscribe({
      next: (res) => {
        this.auth.setSession(res);
        this.notifier.success(isRegistering ? $localize`:Toast shown after a successful registration@@loginWelcome:Welcome aboard!` : $localize`:@@loginWelcomeBack:Welcome back!`);
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        const fallback = isRegistering ? $localize`:@@registerFailed:Registration failed` : $localize`:@@loginFailed:Login failed`;
        this.notifier.error(err?.error?.message || fallback);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  loginWithOAuth2(provider: OAuthProvider) {
    if (this.loading()) return;
    this.auth.startOAuth2(provider);
  }

  setMode(mode: string) {
    const register = mode === 'register';
    if (register === this.isRegister()) return;
    this.isRegister.set(register);
    if (this.isRegister()) {
      this.form.controls.name.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      this.form.controls.name.clearValidators();
    }
    this.form.controls.name.updateValueAndValidity();
    this.form.reset({ email: '', password: '', name: '' });
    this.submitted.set(false);
  }
}


