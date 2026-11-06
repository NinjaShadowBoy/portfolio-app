import { Component, ElementRef, input, viewChild } from '@angular/core';
import { CV_PATHS } from '../../../core/constants/cv';
import { FlagComponent } from '../flag/flag.component';

let nextId = 0;

/**
 * The one CV control on the site: a "CV" button that opens a menu with the
 * English and French PDFs. `onBrand` is the outlined white style for the blue
 * header; the default sits on page surfaces.
 *
 * The menu is a popover, so it renders in the top layer: the header clips its
 * overflow and would cut off an absolutely positioned dropdown. Anchor
 * positioning is not available everywhere, so the menu is placed under its
 * button when it opens.
 */
@Component({
  selector: 'app-cv-menu',
  imports: [FlagComponent],
  templateUrl: './cv-menu.component.html',
  styleUrl: './cv-menu.component.css',
  host: { '[class.on-brand]': 'variant() === "onBrand"', '(window:scroll)': 'close()' },
})
export class CvMenuComponent {
  variant = input<'onBrand' | 'surface'>('surface');

  readonly menuId = `cv-menu-${nextId++}`;
  readonly paths = CV_PATHS;
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');

  onToggle(event: Event) {
    if ((event as ToggleEvent).newState !== 'open') return;
    const rect = this.button().nativeElement.getBoundingClientRect();
    const menu = this.menu().nativeElement;
    // Keep the menu inside the viewport when the button sits near the right edge.
    const left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8);
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.max(8, left)}px`;
  }

  close() {
    const menu = this.menu().nativeElement;
    if (menu.matches?.(':popover-open')) menu.hidePopover();
  }
}
