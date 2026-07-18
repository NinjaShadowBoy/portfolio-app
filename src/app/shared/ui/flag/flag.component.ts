import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Inline SVG country flag for the two site languages (en → Union Jack,
 * fr → Tricolore). Purely decorative — the host element carries no semantics,
 * so pair it with visible text or an aria-label on the surrounding control.
 *
 * Size it from the outside by styling the host element (e.g. the header's
 * `.lang-flag` class); the SVG fills whatever box the host is given.
 */
@Component({
  selector: 'app-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lang() === 'fr') {
      <svg viewBox="0 0 640 480" aria-hidden="true" focusable="false">
        <g fill-rule="evenodd" stroke-width="1pt">
          <path fill="#fff" d="M0 0h640v480H0z" />
          <path fill="#00267f" d="M0 0h213.3v480H0z" />
          <path fill="#f31830" d="M426.7 0H640v480H426.7z" />
        </g>
      </svg>
    } @else {
      <svg viewBox="0 0 640 480" aria-hidden="true" focusable="false">
        <path fill="#012169" d="M0 0h640v480H0z" />
        <path
          fill="#FFF"
          d="m75 0 244 181L562 0h78v62L400 240l240 178v62h-78L320 300 77 480H0v-62l240-178L0 62V0h75z" />
        <path
          fill="#C8102E"
          d="m424 281 216 159v40L369 281h55zM640 0v3L447 149h-55L640 0zM0 440l216-159h55L0 480v-40zM0 0l239 176h-55L0 44V0z" />
        <path fill="#FFF" d="M240 0h160v480H240zM0 160h640v160H0z" />
        <path fill="#C8102E" d="M0 192h640v96H0zM272 0h96v480h-96z" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class FlagComponent {
  /** Which flag to render. */
  readonly lang = input.required<'en' | 'fr'>();
}
