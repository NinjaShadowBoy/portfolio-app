import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
        this.notifier.success(isRegistering ? 'Welcome aboard!' : 'Welcome back!');
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        const fallback = isRegistering ? 'Registration failed' : 'Login failed';
        this.notifier.error(err?.error?.message || fallback);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  loginWithOAuth2(provider: 'google' | 'github' | 'facebook') {
    if (this.loading()) return;

    // OAuth2 is not currently available
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    this.notifier.error(
      `${providerName} login is not available at the moment. Please use email and password to sign in.`
    );
  }

  toggleMode() {
    this.isRegister.update((v) => !v);
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


