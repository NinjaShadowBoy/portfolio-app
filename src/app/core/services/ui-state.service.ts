/**
 * Cross-cutting shell state that other isolated features need to observe
 * without touching the DOM. The header writes `drawerOpen` when its mobile
 * drawer opens or closes; the chat mascot hides while it is open.
 */
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private readonly drawerOpenSignal = signal(false);

  /** The header's full-screen mobile drawer is open. */
  readonly drawerOpen = this.drawerOpenSignal.asReadonly();

  setDrawerOpen(open: boolean): void {
    this.drawerOpenSignal.set(open);
  }
}
