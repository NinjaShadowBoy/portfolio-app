import { Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TechnologiesService } from '../../../core/services/technologies.service';

/**
 * A wrapping row of technology chips. Names known to {@link TechnologiesService}
 * render as documentation links with a logo; unknown names render as plain
 * chips. `variant="pill"` is the larger gradient-hover style used on the
 * project detail page.
 */
@Component({
  selector: 'app-tech-tags',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './tech-tags.component.html',
  styleUrls: ['./tech-tags.component.css'],
  host: { '[class.pill]': 'variant() === "pill"' },
})
export class TechTagsComponent {
  private techService = inject(TechnologiesService);

  /** Technology names exactly as stored on the project. */
  technologies = input.required<string[]>();
  variant = input<'chip' | 'pill'>('chip');

  readonly tags = computed(() =>
    this.technologies().map((name) => {
      const tech = this.techService.getTechnology(name);
      return { name, logo: tech?.logo, docUrl: tech?.docUrl };
    })
  );
}
