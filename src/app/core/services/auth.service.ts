import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import {
  DeviceCodeResponse,
  DevicePollResult,
  LoginRequest,
  LoginResponse,
  OAuthProvider,
  RegisterRequest,
  UserDto,
} from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

export const TOKEN_STORAGE_KEY = 'auth.token';
export const USER_STORAGE_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private notificationService = inject(NotificationService);
  private http = inject(HttpClient);

  private tokenSignal = signal<string | null>(this.load(TOKEN_STORAGE_KEY));
  private userSignal = signal<UserDto | null>(this.load(USER_STORAGE_KEY, JSON.parse));

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  constructor() {
    // Mirror the session into localStorage so it survives reloads.
    effect(() => this.persist(TOKEN_STORAGE_KEY, this.tokenSignal()));
    effect(() => {
      const user = this.userSignal();
      this.persist(USER_STORAGE_KEY, user && JSON.stringify(user));
    });
  }

  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/login`, payload);
  }

  register(payload: RegisterRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/register`, payload);
  }

  startOAuth2(provider: OAuthProvider) {
    if (this.isBrowser) window.location.assign(`${this.apiBaseUrl}/${provider}`);
  }

  // GitHub device flow, for clients without a usable browser redirect. Returns a
  // user code + verification URL; the caller then polls pollGitHubDevice().
  startGitHubDevice() {
    return this.http.post<DeviceCodeResponse>(`${this.apiBaseUrl}/github/device`, {});
  }

  // Polls once. HTTP 200 => LoginResponse (done), HTTP 202 => still pending.
  pollGitHubDevice(deviceCode: string) {
    return this.http
      .post<DevicePollResult>(
        `${this.apiBaseUrl}/github/device/token`,
        { deviceCode },
        { observe: 'response' }
      )
      .pipe(
        map((res): DevicePollResult =>
          res.status === 202 ? res.body ?? { status: 'pending' } : (res.body as LoginResponse)
        )
      );
  }

  setSession(response: LoginResponse) {
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
  }

  updateUser(patch: Partial<UserDto>) {
    this.userSignal.update((current) => current && { ...current, ...patch });
  }

  /** Build a session from a bare JWT (OAuth2 redirect). Throws on a malformed token. */
  setSessionFromToken(token: string): LoginResponse {
    const payload = this.decodeToken(token);
    const email = payload['sub'] || payload['email'] || '';
    const roles: string[] = Array.isArray(payload['roles'])
      ? payload['roles']
      : [payload['role'] ?? 'USER'];
    const response: LoginResponse = {
      token,
      user: {
        id: Number(payload['userId'] ?? payload['sub']),
        email,
        name: payload['name'] || email.split('@')[0] || 'User',
        role: roles.includes('ADMIN') ? 'ADMIN' : 'USER',
        createdAt: new Date(payload['iat'] ? payload['iat'] * 1000 : Date.now()).toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      expiresIn: payload['exp'] ? payload['exp'] * 1000 - Date.now() : 3600000,
    };

    this.setSession(response);
    return response;
  }

  logout() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.notificationService.success($localize`:@@logoutSuccess:You have been logged out successfully`);
  }

  private decodeToken(token: string): Record<string, any> {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      throw new Error('Failed to decode token');
    }
  }

  private load<T = string>(key: string, parse: (raw: string) => T = (raw) => raw as T): T | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return parse(raw);
    } catch {
      return null;
    }
  }

  private persist(key: string, value: string | null): void {
    if (!this.isBrowser) return;
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  }
}
