import { Component, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ScrollStateService } from '../../../core/services/scroll-state.service';
import { ChatUiService } from '../../../core/services/chat-ui.service';

/**
 * Phones only: a pill at the bottom centre, in thumb reach, that appears with
 * the header when the visitor scrolls back up more than one screen down the
 * page. Bottom centre because the mascot roams the edges and starts in the
 * bottom-right corner; the pill sits above it (950 vs 900).
 */
@Component({
  selector: 'app-back-to-top',
  template: `
    @if (visible()) {
      <button class="back-to-top" type="button" (click)="backToTop()"
        aria-label="Back to top" i18n-aria-label="Header back to top@@headerBackToTop">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M12 19V5M5 12l7-7 7 7"></path>
        </svg>
      </button>
    }
  `,
  styleUrl: './back-to-top.component.css',
})
export class BackToTopComponent {
  private readonly document = inject(DOCUMENT);
  private readonly scroll = inject(ScrollStateService);
  private readonly chatUi = inject(ChatUiService);

  /** With the header, while scrolling up; never over the full-screen chat pane. */
  readonly visible = computed(
    () => this.scroll.pastFirstScreen() && !this.scroll.headerHidden() && !this.chatUi.open(),
  );

  /** Scrolls to the top and moves focus to the main content, like the skip link. */
  backToTop(): void {
    const win = this.document.defaultView;
    const reduceMotion = win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    win?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    this.document.getElementById('main-content')?.focus({ preventScroll: true });
  }
}
