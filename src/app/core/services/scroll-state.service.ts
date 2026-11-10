import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { UiStateService } from './ui-state.service';

/** Header layout breakpoint: the sticky, hide-on-scroll behaviour is for phones only. */
const PHONE = '(max-width: 600px)';
/** Near the top of the page the header always shows. */
const TOP_ZONE = 120;
/** Moves under this many px are ignored, so finger jitter does not flicker the header. */
const JITTER = 8;

/**
 * Phone scroll state shared by the sticky header and the "back to top" pill,
 * from one passive, rAF-throttled scroll listener. Browser only: on the server
 * both signals stay false, so SSR renders the header in place and no pill.
 */
@Injectable({ providedIn: 'root' })
export class ScrollStateService {
  private readonly uiState = inject(UiStateService);

  private readonly headerHiddenSignal = signal(false);
  private readonly pastFirstScreenSignal = signal(false);

  /** Scrolling down on a phone: the header has slid away. Scrolling up brings it back. */
  readonly headerHidden = this.headerHiddenSignal.asReadonly();
  /** On a phone, more than one screen down the page. */
  readonly pastFirstScreen = this.pastFirstScreenSignal.asReadonly();

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    const phone = win?.matchMedia?.(PHONE);
    if (!isPlatformBrowser(inject(PLATFORM_ID)) || !win || !phone) return;

    let lastY = win.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = win.scrollY;
      if (!phone.matches || this.uiState.drawerOpen() || y <= TOP_ZONE) {
        this.headerHiddenSignal.set(false);
        lastY = y;
      } else if (Math.abs(y - lastY) >= JITTER) {
        this.headerHiddenSignal.set(y > lastY);
        lastY = y;
      }
      this.pastFirstScreenSignal.set(phone.matches && y > win.innerHeight);
    };
    win.addEventListener('scroll', () => (frame ||= win.requestAnimationFrame(update)), { passive: true });
  }

  /** Bring the header back, e.g. when keyboard focus moves into it. */
  revealHeader(): void {
    this.headerHiddenSignal.set(false);
  }
}
