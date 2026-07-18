import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CommentType = 'critique' | 'suggestion' | 'feature_request';

export interface CommentDto {
  id: number;
  userId: number;
  userName: string;
  userImage: string | null;
  projectId: number | null;
  articleSlug: string | null;
  type: CommentType;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Polymorphic create payload: exactly one of `projectId` / `articleSlug`
 * targets the comment. Field names (type / articleSlug / projectId) mirror the
 * backend CommentCreate DTO wire contract (BE3).
 */
export interface CommentCreatePayload {
  projectId?: number;
  articleSlug?: string;
  type: CommentType;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getProjectComments(projectId: number): Observable<CommentDto[]> {
    return this.http.get<CommentDto[]>(`${this.apiUrl}/projects/${projectId}/comments`);
  }

  getArticleComments(slug: string): Observable<CommentDto[]> {
    return this.http.get<CommentDto[]>(
      `${this.apiUrl}/articles/${encodeURIComponent(slug)}/comments`,
    );
  }

  createComment(payload: CommentCreatePayload): Observable<CommentDto> {
    return this.http.post<CommentDto>(`${this.apiUrl}/comments`, payload);
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
