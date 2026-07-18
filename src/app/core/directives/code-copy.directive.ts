import {
  Directive,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
} from '@angular/core';

/**
 * Adds a copy-to-clipboard button to every `<pre>` inside the host element.
 *
 * Built for `[innerHTML]` content (the Shiki-rendered article body), where
 * Angular components can't be used: each `<pre>` is wrapped in the global
 * `.code-block` container and given a `.copy-button` — both already defined
 * in styles.css — via direct DOM manipulation.
 *
 * Bind the same value as the `[innerHTML]` binding (e.g.
 * `[appCodeCopy]="bodyHtml()"`); the after-render effect tracks it and
 * re-enhances whenever the body is swapped (client-side article navigation).
 * After-render hooks never run on the server, so prerendered HTML ships
 * without buttons and they appear on hydration — copying needs JS anyway.
 */
@Directive({
  selector: '[appCodeCopy]',
  standalone: true,
})
export class CodeCopyDirective {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Change-trigger only; the value itself is not used. */
  readonly appCodeCopy = input<unknown>();

  private readonly copyLabel = $localize`:Code block copy button@@codeCopy:Copy`;
  private readonly copiedLabel = $localize`:Code block copied confirmation@@codeCopied:Copied!`;

  constructor() {
    afterRenderEffect(() => {
      this.appCodeCopy();
      this.enhance();
    });
  }

  private enhance(): void {
    const pres = this.host.nativeElement.querySelectorAll('pre');
    pres.forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-block')) {
        return; // already enhanced
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      pre.replaceWith(wrapper);
      wrapper.appendChild(pre);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-button';
      button.setAttribute('aria-label', this.copyLabel);
      button.setAttribute('title', this.copyLabel);
      // Icon-only: a copy glyph swapped for a check while in the copied state.
      button.innerHTML =
        '<svg class="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
        '</svg>' +
        '<svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<polyline points="20 6 9 17 4 12"></polyline>' +
        '</svg>';
      this.attachCopyHandler(pre, button);
      wrapper.appendChild(button);
    });
  }

  private attachCopyHandler(
    pre: HTMLPreElement,
    button: HTMLButtonElement,
  ): void {
    // Timer lives in the closure so rapid re-clicks restart the copied state
    // instead of an old timer reverting the fresh one early.
    let revertTimer: ReturnType<typeof setTimeout> | null = null;

    button.addEventListener('click', () => {
      const code = pre.querySelector('code')?.innerText ?? pre.innerText;
      navigator.clipboard
        ?.writeText(code.replace(/\n$/, ''))
        .then(() => {
          if (revertTimer !== null) {
            clearTimeout(revertTimer);
          }
          // Remove + reflow + re-add so the check-pop animation restarts
          // even when the button is clicked again mid-animation.
          button.classList.remove('copied');
          void button.offsetWidth;
          button.classList.add('copied');
          button.setAttribute('aria-label', this.copiedLabel);
          button.setAttribute('title', this.copiedLabel);
          revertTimer = setTimeout(() => {
            button.classList.remove('copied');
            button.setAttribute('aria-label', this.copyLabel);
            button.setAttribute('title', this.copyLabel);
          }, 1600);
        })
        .catch(() => {
          /* Clipboard denied (permissions / insecure context) — keep quiet. */
        });
    });
  }
}
