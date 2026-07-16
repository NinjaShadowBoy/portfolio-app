import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// Identity is the current participant: a real logged-in account or an
// auto-provisioned anonymous user (anonymous-<animal>-N). Null until resolved.
export interface Identity {
  id: number;
  name: string;
  role: string;
  provider: string;
  imageUrl: string | null;
  anonymous: boolean;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private identitySignal = signal<Identity | null>(null);
  readonly identity = this.identitySignal.asReadonly();

  constructor() {
    // Re-resolve whenever the auth token changes (login/logout) and once on
    // startup. The backend reports the real account or the anon cookie's user.
    effect(() => {
      this.authService.token();
      this.refresh();
    });
  }

  refresh(): void {
    if (!this.isBrowser) return;
    this.http
      .get<{ identity: Identity | null }>(`${environment.apiBaseUrl}/auth/me`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => this.identitySignal.set(res.identity),
        error: () => this.identitySignal.set(null),
      });
  }
}
