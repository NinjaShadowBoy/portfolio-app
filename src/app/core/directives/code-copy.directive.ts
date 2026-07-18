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
      button.className = 'copy-button btn-ghost';
      button.textContent = this.copyLabel;
      button.setAttribute('aria-label', this.copyLabel);
      button.addEventListener('click', () => this.copy(pre, button));
      wrapper.appendChild(button);
    });
  }

  private copy(pre: HTMLPreElement, button: HTMLButtonElement): void {
    const code = pre.querySelector('code')?.innerText ?? pre.innerText;
    navigator.clipboard
      ?.writeText(code.replace(/\n$/, ''))
      .then(() => {
        button.textContent = this.copiedLabel;
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = this.copyLabel;
          button.classList.remove('copied');
        }, 2000);
      })
      .catch(() => {
        /* Clipboard denied (permissions / insecure context) — keep quiet. */
      });
  }
}
