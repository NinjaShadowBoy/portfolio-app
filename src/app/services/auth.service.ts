import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, LoginResponse, RegisterRequest, UserDto } from '../interfaces/auth.interface';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

const TOKEN_STORAGE_KEY = 'auth.token';
const USER_STORAGE_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/auth`;
  private notificationService = inject(NotificationService);

  // Signals store
  private tokenSignal = signal<string | null>(this.loadToken());
  private userSignal = signal<UserDto | null>(this.loadUser());

  // Derived state
  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  constructor(private http: HttpClient) {
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

  setSession(response: LoginResponse) {
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
  }

  logout() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.notificationService.success('You have been logged out successfully');
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


