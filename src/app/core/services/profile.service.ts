import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserDto } from '../interfaces/auth.interface';

export interface ProfileUpdate {
  name?: string;
  imageUrl?: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/users/me`;

  updateProfile(payload: ProfileUpdate): Observable<UserDto> {
    return this.http.patch<UserDto>(this.apiUrl, payload);
  }

  changePassword(payload: PasswordChange): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/password`, payload);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
