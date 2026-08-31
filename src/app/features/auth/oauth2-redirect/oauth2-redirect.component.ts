import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-oauth2-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="oauth2-redirect-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">{{ message() }}</p>
      </div>
    </div>
  `,
  styles: [`
    .oauth2-redirect-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      background: var(--surface-base);
    }

    .loading-spinner {
      text-align: center;
      padding: 2rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      margin: 0 auto 1.5rem;
      border: 4px solid var(--border-subtle);
      border-top-color: var(--color-primary-500);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-text {
      font-size: 1rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class Oauth2RedirectComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private notifier = inject(NotificationService);
  private params = toSignal(this.route.queryParams);

  message = signal($localize`:@@oauthCompleting:Completing authentication...`);

  constructor() {
    effect(() => {
      const params = this.params();
      if (!params || Object.keys(params).length === 0) return;

      const token = params['token'];
      const error = params['error'];

      if (error) {
        this.handleAuthError(error);
        return;
      }

      if (!token) {
        this.handleAuthError($localize`:@@oauthNoToken:No authentication token received`);
        return;
      }

      this.processToken(token);
    });
  }

  private handleAuthError(errorMessage: string): void {
    this.message.set($localize`:@@oauthFailed:Authentication failed`);
    this.notifier.error(errorMessage);
    setTimeout(() => this.router.navigateByUrl('/login'), 2000);
  }

  private processToken(token: string): void {
    try {
      this.auth.setSessionFromToken(token);

      this.notifier.success($localize`:@@oauthSuccess:Successfully authenticated!`);
      this.message.set($localize`:@@oauthRedirecting:Redirecting...`);
      setTimeout(() => this.router.navigateByUrl('/home'), 1000);
    } catch (err) {
      console.error('Token decode error:', err);
      this.handleAuthError($localize`:@@oauthInvalidToken:Invalid authentication token`);
    }
  }
}
