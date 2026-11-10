import { Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DARK_LOGOS, TechnologiesService } from '../../../core/services/technologies.service';

/**
 * A wrapping row of technology chips. Names known to {@link TechnologiesService}
 * render as documentation links with a logo; unknown names render as plain
 * chips. `variant="pill"` is the larger gradient-hover style used on the
 * project detail page; `variant="outline"` is the quiet round outline used on
 * project cards.
 */
@Component({
  selector: 'app-tech-tags',
  imports: [NgTemplateOutlet],
  templateUrl: './tech-tags.component.html',
  styleUrl: './tech-tags.component.css',
  host: {
    '[class.pill]': 'variant() === "pill"',
    '[class.outline]': 'variant() === "outline"',
  },
})
export class TechTagsComponent {
  private techService = inject(TechnologiesService);

  /** Technology names exactly as stored on the project. */
  technologies = input.required<string[]>();
  variant = input<'chip' | 'pill' | 'outline'>('chip');
  /** False inside project cards: plain labels, so a tap on the card opens the project, not a docs site. */
  links = input(true);

  readonly tags = computed(() =>
    this.technologies().map((name) => {
      const tech = this.techService.getTechnology(name);
      return { name, logo: tech?.logo, docUrl: tech?.docUrl, dark: DARK_LOGOS.has(name.toLowerCase().trim()) };
    })
  );
}
