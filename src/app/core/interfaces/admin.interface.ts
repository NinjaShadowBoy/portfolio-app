import { UserRole } from './auth.interface';
import { CommentDto, CommentType } from '../services/comment.service';

/** Wire shapes of the backend `/admin/*` routes (internal/dto/admin.go). */

export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'GITHUB' | 'FACEBOOK' | 'ANON';

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminStats {
  users: number;
  anonymousUsers: number;
  admins: number;
  projects: number;
  comments: number;
  ratings: number;
  unreadMessages: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  provider: AuthProvider;
  imageUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  commentCount: number;
  ratingCount: number;
}

export interface AdminUserQuery {
  search?: string;
  includeAnonymous?: boolean;
  limit?: number;
  offset?: number;
}

/** A moderation feed entry: the public comment plus author provider and project name. */
export interface AdminComment extends CommentDto {
  userProvider: AuthProvider;
  projectName: string | null;
}

export type CommentTarget = 'project' | 'article';

export interface AdminCommentQuery {
  type?: CommentType;
  target?: CommentTarget;
  limit?: number;
  offset?: number;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  submittedAt: string;
  isRead: boolean;
  isReplied: boolean;
}
