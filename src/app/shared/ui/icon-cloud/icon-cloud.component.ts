import { Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TechnologiesService } from '../../../core/services/technologies.service';
import { CloudEntry, LEVEL_SIZE, UsageLevel, layoutCloud } from './icon-cloud.layout';

/**
 * Logos that are black or near-black and vanish on a dark surface. In dark
 * mode they are inverted, with a hue rotation that keeps any brand colour.
 */
const DARK_LOGOS = new Set(['next.js', 'expo react native', 'chatgpt', 'openai', 'gradle', 'sdl', 'maven', 'mysql', 'aws', 'ovh', 'mcp']);

const LEVEL_LABEL: Record<UsageLevel, string> = {
  3: $localize`:@@iconCloudLevelDaily:used daily`,
  2: $localize`:@@iconCloudLevelRegular:used regularly`,
  1: $localize`:@@iconCloudLevelOccasional:used occasionally`,
};

/**
 * A word-cloud-like cluster of technology logos, sized by usage level. The
 * layout is a pure function of the entries, so server and client render the
 * same markup; the container reserves its aspect ratio before any logo loads.
 */
@Component({
  selector: 'app-icon-cloud',
  imports: [NgTemplateOutlet],
  templateUrl: './icon-cloud.component.html',
  styleUrl: './icon-cloud.component.css',
})
export class IconCloudComponent {
  private techService = inject(TechnologiesService);

  entries = input.required<CloudEntry[]>();
  /** Accessible name of the list, usually the group heading. */
  label = input<string>('');

  /** Names whose logo failed to load; they fall back to an initial. */
  private readonly failed = signal<ReadonlySet<string>>(new Set());

  readonly layout = computed(() => {
    const { width, height, entries } = layoutCloud(this.entries());
    const failed = this.failed();
    return {
      width,
      height,
      items: entries.map((e) => {
        const tech = this.techService.getTechnology(e.name);
        const key = e.name.toLowerCase().trim();
        return {
          ...e,
          key: e.name,
          name: tech?.name ?? e.name,
          logo: failed.has(e.name) ? undefined : tech?.logo,
          docUrl: tech?.docUrl,
          dark: DARK_LOGOS.has(key),
          px: LEVEL_SIZE[e.level],
          initial: (tech?.name ?? e.name).charAt(0),
          a11yName: `${tech?.name ?? e.name}, ${LEVEL_LABEL[e.level]}`,
        };
      }),
    };
  });

  markFailed(name: string): void {
    this.failed.update((set) => new Set(set).add(name));
  }
}
