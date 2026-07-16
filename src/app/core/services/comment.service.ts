import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CommentDto {
  id: number;
  userId: number;
  userName: string;
  userImage: string | null;
  projectId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getProjectComments(projectId: number): Observable<CommentDto[]> {
    return this.http.get<CommentDto[]>(`${this.apiUrl}/projects/${projectId}/comments`);
  }

  createComment(projectId: number, body: string): Observable<CommentDto> {
    return this.http.post<CommentDto>(`${this.apiUrl}/comments`, { projectId, body });
  }

  updateComment(commentId: number, body: string): Observable<CommentDto> {
    return this.http.put<CommentDto>(`${this.apiUrl}/comments/${commentId}`, { body });
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/comments/${commentId}`);
  }

  getMyComments(): Observable<CommentDto[]> {
    return this.http.get<CommentDto[]>(`${this.apiUrl}/users/me/comments`);
  }
}
