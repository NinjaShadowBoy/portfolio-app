import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-oauth2-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="oauth2-redirect-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">{{ message }}</p>
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
export class Oauth2RedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private notifier = inject(NotificationService);

  message = 'Completing authentication...';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const error = params['error'];

      if (error) {
        this.handleAuthError(error);
        return;
      }

      if (!token) {
        this.handleAuthError('No authentication token received');
        return;
      }

      this.processToken(token);
    });
  }

  private handleAuthError(errorMessage: string): void {
    this.message = 'Authentication failed';
    this.notifier.error(errorMessage);
    setTimeout(() => this.router.navigateByUrl('/login'), 2000);
  }

  private processToken(token: string): void {
    try {
      const payload = this.decodeToken(token);

      if (!payload || !payload.sub) {
        throw new Error('Invalid token payload');
      }

      // Set session with token and user data
      this.auth.setSession({
        token: token,
        user: {
          id: payload.sub,
          email: payload.email || '',
          name: payload.name || '',
          role: payload.role || 'USER',
          createdAt: payload.iat
            ? new Date(payload.iat * 1000).toISOString()
            : new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        },
        expiresIn: payload.exp ? (payload.exp * 1000 - Date.now()) : 3600000
      });

      this.notifier.success('Successfully authenticated!');
      this.message = 'Redirecting...';
      setTimeout(() => this.router.navigateByUrl('/home'), 1000);
    } catch (err) {
      console.error('Token decode error:', err);
      this.handleAuthError('Invalid authentication token');
    }
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }
}
