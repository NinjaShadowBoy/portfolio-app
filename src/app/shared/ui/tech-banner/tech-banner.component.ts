import { Component, computed, input } from '@angular/core';
import { LazyLoadDirective } from '../../../core/directives/lazy-load.directive';
import { Technology } from '../../../core/services/technologies.service';

/** Repeats the list four times so the marquee loops seamlessly. */
const REPEATS = 4;

@Component({
  selector: 'app-tech-banner',
  standalone: true,
  imports: [LazyLoadDirective],
  templateUrl: './tech-banner.component.html',
  styleUrls: ['./tech-banner.component.css'],
})
export class TechBannerComponent {
  technologies = input.required<Technology[]>();
  direction = input<'left' | 'right'>('left');
  speed = input(20); // seconds per loop
  showStars = input(false);

  protected displayItems = computed(() => Array<Technology[]>(REPEATS).fill(this.technologies()).flat());

  /** Whole-number proficiency means proficient (★); a .5 means only tried (☆). */
  protected isGoodAt(tech: Technology): boolean {
    return Number.isInteger(tech.proficiency ?? 0);
  }

  /** One slot per star, i.e. the integer part of the proficiency. */
  createRange(n: number | undefined): number[] {
    return new Array(Math.max(0, Math.floor(n ?? 0)));
  }
}
