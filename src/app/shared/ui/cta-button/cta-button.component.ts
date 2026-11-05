import { Component, computed, input } from '@angular/core';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export type CtaIcon = 'arrow-right' | 'external' | 'search';

const ICON_ALT: Record<CtaIcon, string> = {
  'arrow-right': 'Arrow icon',
  external: 'External link icon',
  search: 'Search icon',
};

/** Renders as a router link, a plain anchor, or a button depending on which target is given. */
@Component({
  selector: 'app-cta-button',
  imports: [RouterLink, NgOptimizedImage, NgTemplateOutlet],
  templateUrl: './cta-button.component.html',
  styleUrl: './cta-button.component.css',
})
export class CtaButtonComponent {
  readonly text = input('Learn More');
  readonly routerLink = input<string | any[]>();
  readonly href = input<string>();
  readonly icon = input<CtaIcon>('arrow-right');
  readonly variant = input<'primary' | 'secondary' | 'outline'>('outline');
  readonly target = input<string>();

  readonly iconSrc = computed(() => `assets/icons/${this.icon()}.svg`);
  readonly iconAlt = computed(() => ICON_ALT[this.icon()]);
}
