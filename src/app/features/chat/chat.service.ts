/**
 * The conversation behind the chat pane: one fetch to POST /chat, parsed as
 * SSE, with the answer kept in signals and mirrored into sessionStorage so it
 * survives navigation inside the tab. `fetch` is used rather than HttpClient
 * because a streamed body is not an HttpClient response; that also means the
 * credentials and bearer token are added here, not by the interceptor.
 */
import { LOCALE_ID, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatUiService } from '../../core/services/chat-ui.service';
import { SseEvent, parseSse } from '../../core/utils/sse';
import { environment } from '../../../environments/environment';

export type ChatRole = 'user' | 'assistant';
export type ChatStatus = 'idle' | 'streaming' | 'limited' | 'error' | 'disabled' | 'offline';
/** `download` is a file the visitor asked for (a CV or a paper); the API always sends it. */
export type ChatLinkKind = 'project' | 'publication' | 'pdf' | 'download' | 'page' | 'external';

export interface ChatLink {
  title: string;
  url: string;
  kind: ChatLinkKind;
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  /** Cards the API returned for this answer. */
  links?: ChatLink[];
  /** Localized failure text; the answer is incomplete or missing. */
  error?: string;
}

export interface ChatTurn {
  role: ChatRole;
  text: string;
}

export const CHAT_MAX_TEXT = 1000;
export const CHAT_MAX_MESSAGES = 12;
const STORAGE_KEY = 'chat.conversation';
const MAX_PAGE_PATH = 200;
const LINK_KINDS: readonly ChatLinkKind[] = ['project', 'publication', 'pdf', 'download', 'page', 'external'];

/** Localized status line for a tool the model is running. */
export function toolStatusLabel(name: string): string | null {
  switch (name) {
    case 'search_site':
      return $localize`:Chat tool status@@chatToolSearch:Searching the site...`;
    case 'list_projects':
      return $localize`:Chat tool status@@chatToolProjects:Looking through projects...`;
    case 'get_project':
      return $localize`:Chat tool status@@chatToolProject:Opening a project...`;
    case 'list_publications':
      return $localize`:Chat tool status@@chatToolPublications:Looking through publications...`;
    case 'get_contact_options':
      return $localize`:Chat tool status@@chatToolContact:Finding contact options...`;
    case 'read_page':
      return $localize`:Chat tool status@@chatToolReadPage:Reading the page...`;
    case 'get_document':
      return $localize`:Chat tool status@@chatToolDocument:Getting the file ready...`;
    default:
      return null;
  }
}

const ERROR_STATUS: Record<string, ChatStatus> = {
  CHAT_DISABLED: 'disabled',
  CHAT_LIMITED: 'limited',
  RATE_LIMITED: 'error',
  CHAT_BUSY: 'error',
  ORIGIN_NOT_ALLOWED: 'error',
  VALIDATION_ERROR: 'error',
  INTERNAL_ERROR: 'error',
  CHAT_TIMEOUT: 'error',
};

function limitedMessage(): string {
  return $localize`:Chat error@@chatErrorLimited:You have reached today's message limit. Come back tomorrow, or use the contact page.`;
}

function messageForCode(code: string): string {
  switch (code) {
    case 'CHAT_LIMITED':
      return limitedMessage();
    case 'RATE_LIMITED':
      return $localize`:Chat error@@chatErrorRate:You are sending messages too quickly. Try again in a few seconds.`;
    case 'CHAT_BUSY':
      return $localize`:Chat error@@chatErrorBusy:The assistant is busy right now. Try again in a few seconds.`;
    case 'CHAT_DISABLED':
      return $localize`:Chat error@@chatErrorDisabled:The assistant is unavailable right now.`;
    case 'CHAT_TIMEOUT':
      return $localize`:Chat error@@chatErrorTimeout:The answer took too long. Please try again.`;
    case 'VALIDATION_ERROR':
      return $localize`:Chat error@@chatErrorValidation:That message could not be sent. Try a shorter message.`;
    default:
      return $localize`:Chat error@@chatErrorGeneric:Something went wrong. Please try again.`;
  }
}

function offlineMessage(): string {
  return $localize`:Chat error@@chatErrorOffline:You are offline. Check your connection and try again.`;
}

function streamErrorMessage(code: string): string {
  if (code === 'limited') return limitedMessage();
  if (code === 'timeout') return messageForCode('CHAT_TIMEOUT');
  if (code === 'cancelled') {
    return $localize`:Chat error@@chatErrorCancelled:The answer was interrupted.`;
  }
  return messageForCode('');
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly auth = inject(AuthService);
  private readonly chatUi = inject(ChatUiService);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID).startsWith('fr') ? 'fr' : 'en';

  private readonly messagesSignal = signal<ChatMessage[]>(this.restore());
  private readonly statusSignal = signal<ChatStatus>('idle');
  private readonly toolStatusSignal = signal<string | null>(null);
  private readonly retryAfterSignal = signal<number | null>(null);
  private controller: AbortController | null = null;

  readonly messages = this.messagesSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly toolStatus = this.toolStatusSignal.asReadonly();
  /** Seconds from a 429's Retry-After header, when the server sent one. */
  readonly retryAfter = this.retryAfterSignal.asReadonly();
  /** Shared with the shell so the pane and the config call agree. */
  readonly remainingToday = this.chatUi.remainingToday;

  constructor() {
    if (!this.isBrowser) return;
    // Leaving the site ends the answer; closing the pane does not call stop().
    window.addEventListener('pagehide', () => this.stop());
    effect(() => this.persist(this.messagesSignal()));
  }

  /** Sends one turn. The last six messages are what the server forwards to the model. */
  async send(text: string): Promise<void> {
    if (!this.isBrowser || this.statusSignal() === 'streaming') return;
    const trimmed = text.trim().slice(0, CHAT_MAX_TEXT);
    if (!trimmed) return;

    this.retryAfterSignal.set(null);
    this.toolStatusSignal.set(null);
    this.messagesSignal.update((messages) => [
      ...messages,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: '' },
    ]);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.failWith('offline', offlineMessage());
      return;
    }

    this.statusSignal.set('streaming');
    const controller = new AbortController();
    this.controller = controller;
    try {
      const response = await fetch(`${environment.apiBaseUrl}/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: this.headers(),
        body: JSON.stringify({
          locale: this.locale,
          pagePath: this.pagePath(),
          messages: this.history(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.failFromResponse(response);
        return;
      }
      if (!response.body) {
        this.failWith('error', messageForCode(''));
        return;
      }

      for await (const event of parseSse(response.body)) this.handleEvent(event);
      if (this.statusSignal() === 'streaming') this.statusSignal.set('idle');
    } catch (error) {
      if (controller.signal.aborted) return;
      const offline = error instanceof TypeError || (error as Error)?.name === 'TypeError';
      this.failWith(offline ? 'offline' : 'error', offline ? offlineMessage() : messageForCode(''));
    } finally {
      if (this.controller === controller) this.controller = null;
      this.toolStatusSignal.set(null);
    }
  }

  /** Aborts the running answer. A partial answer is kept. */
  stop(): void {
    const controller = this.controller;
    this.controller = null;
    controller?.abort();
    this.toolStatusSignal.set(null);
    if (this.statusSignal() === 'streaming') this.statusSignal.set('idle');
  }

  /** Starts over: aborts, empties the conversation and the stored copy. */
  clear(): void {
    this.stop();
    this.retryAfterSignal.set(null);
    this.messagesSignal.set([]);
    this.statusSignal.set('idle');
    this.toolStatusSignal.set(null);
  }

  private handleEvent(event: SseEvent): void {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return; // a malformed frame is skipped, not fatal
    }

    switch (event.event) {
      case 'text':
        if (typeof data['text'] === 'string') this.appendText(data['text']);
        break;
      case 'tool':
        if (typeof data['name'] === 'string') this.toolStatusSignal.set(toolStatusLabel(data['name']));
        break;
      case 'links':
        if (Array.isArray(data['links'])) this.attachLinks(data['links']);
        break;
      case 'move':
        if (typeof data['name'] === 'string') this.chatUi.requestMove(data['name']);
        break;
      case 'done':
        this.chatUi.setRemainingToday(typeof data['remainingToday'] === 'number' ? data['remainingToday'] : null);
        this.toolStatusSignal.set(null);
        this.statusSignal.set('idle');
        break;
      case 'error': {
        const code = typeof data['code'] === 'string' ? data['code'] : 'internal';
        this.failWith(code === 'limited' ? 'limited' : 'error', streamErrorMessage(code));
        break;
      }
    }
  }

  private appendText(delta: string): void {
    this.messagesSignal.update((messages) => {
      const last = messages.at(-1);
      if (!last || last.role !== 'assistant') return messages;
      return [...messages.slice(0, -1), { ...last, text: last.text + delta }];
    });
  }

  private attachLinks(raw: unknown[]): void {
    const links = raw
      .map((link) => link as Partial<ChatLink>)
      .filter((link): link is ChatLink => typeof link.title === 'string' && typeof link.url === 'string')
      .map((link) => ({
        title: link.title,
        url: link.url,
        kind: LINK_KINDS.includes(link.kind) ? link.kind : 'page',
      }));

    this.messagesSignal.update((messages) => {
      const last = messages.at(-1);
      if (!last || last.role !== 'assistant') return messages;
      const merged = [...(last.links ?? [])];
      for (const link of links) {
        if (!merged.some((existing) => existing.url === link.url)) merged.push(link);
      }
      return [...messages.slice(0, -1), { ...last, links: merged }];
    });
  }

  private async failFromResponse(response: Response): Promise<void> {
    let code = '';
    try {
      const body = (await response.json()) as { code?: unknown };
      code = typeof body.code === 'string' ? body.code : '';
    } catch {
      // A proxy error page rather than the API's JSON shape.
    }

    const retryAfter = Number(response.headers.get('Retry-After'));
    this.retryAfterSignal.set(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
    if (code === 'CHAT_DISABLED') this.chatUi.setAvailable(false);

    this.failWith(ERROR_STATUS[code] ?? 'error', messageForCode(code));
  }

  /**
   * Records a failure. An empty assistant bubble is removed for limited and
   * disabled, where the pane's notice already says everything.
   */
  private failWith(status: ChatStatus, message: string): void {
    this.statusSignal.set(status);
    this.toolStatusSignal.set(null);
    this.messagesSignal.update((messages) => {
      const last = messages.at(-1);
      if (!last || last.role !== 'assistant') return messages;
      if (!last.text && (status === 'limited' || status === 'disabled')) return messages.slice(0, -1);
      return [...messages.slice(0, -1), { ...last, error: message }];
    });
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.auth.token();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private pagePath(): string {
    const path = this.router.url.split(/[?#]/)[0].replace(/^\/fr(?=\/|$)/, '');
    return (path || '/').slice(0, MAX_PAGE_PATH);
  }

  private history(): ChatTurn[] {
    return this.messagesSignal()
      .filter((message) => message.text.trim().length > 0)
      .slice(-CHAT_MAX_MESSAGES)
      .map((message) => ({ role: message.role, text: message.text.slice(0, CHAT_MAX_TEXT) }));
  }

  private restore(): ChatMessage[] {
    if (!this.isBrowser) return [];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (message): message is ChatMessage =>
          !!message &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.text === 'string',
      );
    } catch {
      return [];
    }
  }

  private persist(messages: ChatMessage[]): void {
    try {
      if (messages.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Quota or disabled storage: the conversation simply does not survive a reload.
    }
  }
}
