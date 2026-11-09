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

/** Chat usage as reported by the backend's `/admin/chat/usage`. */
export interface ChatUsageDay {
  /** UTC date in `YYYY-MM-DD` form. */
  day: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

/** One ranked usage subject: `"ip:<hash>"` for visitors, `"u:<userId>"` for users. */
export interface ChatUsageSubject {
  subject: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ChatUsageToday {
  requests: number;
  tokens: number;
  /** 0 when no budget is configured. */
  tokenBudget: number;
  budgetRemaining: number;
}

export interface ChatUsage {
  /** Every day in the range, newest first, with zero rows for gaps. */
  days: ChatUsageDay[];
  /** At most 10 entries. */
  topSubjects: ChatUsageSubject[];
  today: ChatUsageToday;
}

/** One indexed knowledge source, used by the assistant's site search. */
export interface KnowledgeSource {
  kind: KnowledgeSourceKind;
  ref: string;
  lang: string;
  title: string | null;
  url: string | null;
  chunks: number;
  updatedAt: string | null;
}

export type KnowledgeSourceKind = 'project' | 'publication' | 'cv' | 'about';

/** Result of the last knowledge index sync; `error` is set when the run failed. */
export interface KnowledgeLastSync {
  startedAt: string;
  finishedAt: string | null;
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
  error: string | null;
}

export interface KnowledgeIndex {
  enabled: boolean;
  sources: KnowledgeSource[];
  lastSync: KnowledgeLastSync | null;
  /** True while a sync is running on the server. */
  syncing: boolean;
}
