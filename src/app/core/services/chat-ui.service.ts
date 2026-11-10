/**
 * Small shared shell for the chat assistant UI. The mascot (launcher) and the
 * chat pane both read the open state, the mascot mode and whether chat is on.
 * It must stay small and documented; the conversation itself lives in
 * `features/chat/chat.service.ts`.
 */
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationSkipped, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Same breakpoint as the chat pane's switch to a full-screen dialog. */
const FULL_SCREEN_PANE = '(max-width: 768px)';

export type MascotMode = 'animated' | 'still' | 'hidden';

/** localStorage key the mascot mode persists under (browser only). */
export const MASCOT_MODE_KEY = 'chat-mascot-mode';

@Injectable({ providedIn: 'root' })
export class ChatUiService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly openSignal = signal(false);
  /** Starts false: nothing renders until GET /chat/config says chat is on. */
  private readonly availableSignal = signal(false);
  private readonly paneRequestedSignal = signal(false);
  private readonly mascotModeSignal = signal<MascotMode>(this.restoreMode());
  private readonly remainingTodaySignal = signal<number | null>(null);
  private readonly moveSignal = signal<{ name: string; id: number } | null>(null);
  private configRequested = false;

  /** The chat pane is currently shown. */
  readonly open = this.openSignal.asReadonly();
  /** Whether the chat feature is on; false hides both mascot and pane. */
  readonly available = this.availableSignal.asReadonly();
  /** Latches true on the first open so the pane chunk loads only then. */
  readonly paneRequested = this.paneRequestedSignal.asReadonly();
  /** The visitor's mascot motion setting. */
  readonly mascotMode = this.mascotModeSignal.asReadonly();
  /** Messages left today; null when the visitor has no daily cap. */
  readonly remainingToday = this.remainingTodaySignal.asReadonly();
  /** The latest ninja move the chat asked the mascot for; `id` tells repeats apart. */
  readonly move = this.moveSignal.asReadonly();

  constructor() {
    // At 768px and below the pane is a full-screen dialog, so a link followed from
    // the chat would change the page out of sight. Any navigation closes it there;
    // NavigationSkipped covers a link to the page already shown.
    const media = this.isBrowser ? globalThis.matchMedia?.(FULL_SCREEN_PANE) : undefined;
    inject(Router, { optional: true })
      ?.events.pipe(filter((e) => e instanceof NavigationStart || e instanceof NavigationSkipped))
      .subscribe(() => {
        if (this.openSignal() && media?.matches) this.closePane();
      });
  }

  /** The assistant asked for a ninja move; the mascot performs it. */
  requestMove(name: string): void {
    this.moveSignal.update((last) => ({ name, id: (last?.id ?? 0) + 1 }));
  }

  toggle(): void {
    if (this.openSignal()) this.closePane();
    else this.openPane();
  }

  openPane(): void {
    this.paneRequestedSignal.set(true);
    this.openSignal.set(true);
  }

  closePane(): void {
    this.openSignal.set(false);
  }

  setMascotMode(mode: MascotMode): void {
    this.mascotModeSignal.set(mode);
    if (this.isBrowser) {
      try {
        localStorage.setItem(MASCOT_MODE_KEY, mode);
      } catch {
        // Storage can be unavailable (private mode, quota); the setting simply
        // does not survive a reload.
      }
    }
  }

  setAvailable(available: boolean): void {
    this.availableSignal.set(available);
  }

  setRemainingToday(remaining: number | null): void {
    this.remainingTodaySignal.set(remaining);
  }

  /**
   * Reads GET /chat/config once, in the browser only, when the mascot loads.
   * A failure leaves chat unavailable so a broken feature stays hidden.
   */
  async loadConfig(): Promise<void> {
    if (!this.isBrowser || this.configRequested) return;
    this.configRequested = true;
    try {
      const response = await fetch(`${environment.apiBaseUrl}/chat/config`, { credentials: 'include' });
      if (!response.ok) throw new Error(`chat config: ${response.status}`);
      const config = (await response.json()) as { enabled?: unknown; remainingToday?: unknown };
      this.availableSignal.set(config.enabled === true);
      this.remainingTodaySignal.set(typeof config.remainingToday === 'number' ? config.remainingToday : null);
    } catch {
      this.availableSignal.set(false);
    }
  }

  private restoreMode(): MascotMode {
    if (!this.isBrowser) return 'animated';
    try {
      const stored = localStorage.getItem(MASCOT_MODE_KEY);
      return stored === 'still' || stored === 'hidden' ? stored : 'animated';
    } catch {
      return 'animated';
    }
  }
}
