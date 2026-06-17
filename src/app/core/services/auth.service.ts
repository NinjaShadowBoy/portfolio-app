import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, LoginResponse, OAuthProvider, RegisterRequest, UserDto } from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

const TOKEN_STORAGE_KEY = 'auth.token';
const USER_STORAGE_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/auth`;
  private notificationService = inject(NotificationService);
  private http = inject(HttpClient);

  // Signals store
  private tokenSignal = signal<string | null>(this.loadToken());
  private userSignal = signal<UserDto | null>(this.loadUser());

  // Derived state
  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  constructor() {
    effect(() => {
      const token = this.tokenSignal();
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    });

    effect(() => {
      const user = this.userSignal();
      if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_STORAGE_KEY);
    });
  }

  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/login`, payload);
  }

  register(payload: RegisterRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/register`, payload);
  }

  startOAuth2(provider: OAuthProvider) {
    window.location.assign(`${this.apiBaseUrl}/${provider}`);
  }

  setSession(response: LoginResponse) {
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
  }

  setSessionFromToken(token: string): LoginResponse {
    const payload = this.decodeToken(token);
    const email = payload.sub || payload.email || '';
    const roles = Array.isArray(payload.roles) ? payload.roles : payload.role ? [payload.role] : ['USER'];
    const role = roles.includes('ADMIN') ? 'ADMIN' : 'USER';
    const name = payload.name || email.split('@')[0] || 'User';
    const createdAt = payload.iat
      ? new Date(payload.iat * 1000).toISOString()
      : new Date().toISOString();
    const response: LoginResponse = {
      token,
      user: {
        id: Number(payload.userId ?? payload.sub),
        email,
        name,
        role,
        createdAt,
        lastLoginAt: new Date().toISOString(),
      },
      expiresIn: payload.exp ? payload.exp * 1000 - Date.now() : 3600000,
    };

    this.setSession(response);
    return response;
  }

  logout() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.notificationService.success('You have been logged out successfully');
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }

  private loadToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private loadUser(): UserDto | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserDto;
    } catch {
      return null;
    }
  }
}


