import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserDto, UserRole } from '../interfaces/auth.interface';
import {
  AdminComment,
  AdminCommentQuery,
  AdminStats,
  AdminUser,
  AdminUserQuery,
  ChatUsage,
  ContactMessage,
  KnowledgeIndex,
  KnowledgeLastSync,
  Page,
} from '../interfaces/admin.interface';

/**
 * Admin-only API calls: users, feedback moderation, contact messages, the
 * overview counts, chat usage and the knowledge index. Every route sits behind
 * the backend's Admin middleware; the auth interceptor attaches the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/admin/stats`);
  }

  listUsers(query: AdminUserQuery = {}): Observable<Page<AdminUser>> {
    return this.http.get<Page<AdminUser>>(`${this.apiUrl}/admin/users`, { params: toParams(query) });
  }

  updateUserRole(userId: number, role: UserRole): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.apiUrl}/admin/users/${userId}/role`, { role });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/users/${userId}`);
  }

  listComments(query: AdminCommentQuery = {}): Observable<Page<AdminComment>> {
    return this.http.get<Page<AdminComment>>(`${this.apiUrl}/admin/comments`, { params: toParams(query) });
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/comments/${commentId}`);
  }

  listMessages(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(`${this.apiUrl}/contact`);
  }

  markMessageRead(messageId: number): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(`${this.apiUrl}/contact/${messageId}/read`, {});
  }

  markMessageReplied(messageId: number): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(`${this.apiUrl}/contact/${messageId}/replied`, {});
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contact/${messageId}`);
  }

  /** Chat usage over the last `days` UTC days (1..90, enforced by the backend). */
  getChatUsage(days: number): Observable<ChatUsage> {
    return this.http.get<ChatUsage>(`${this.apiUrl}/admin/chat/usage`, { params: { days: String(days) } });
  }

  /** The knowledge index state: enabled flag, sources and the last sync result. */
  getKnowledge(): Observable<KnowledgeIndex> {
    return this.http.get<KnowledgeIndex>(`${this.apiUrl}/admin/knowledge`);
  }

  /** Starts a reindex; 200 returns the new sync result (it may contain `error`), 409/503 report why not. */
  reindexKnowledge(): Observable<KnowledgeLastSync> {
    return this.http.post<KnowledgeLastSync>(`${this.apiUrl}/admin/knowledge/reindex`, {});
  }
}

/** Drops unset and empty values so the backend sees only real filters. */
function toParams(query: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
