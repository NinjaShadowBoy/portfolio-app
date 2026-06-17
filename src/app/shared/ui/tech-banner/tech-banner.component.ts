import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LazyLoadDirective } from '../../../core/directives/lazy-load.directive';
import { Technology } from '../../../core/services/technologies.service';

@Component({
  selector: 'app-tech-banner',
  standalone: true,
  imports: [CommonModule, LazyLoadDirective],
  templateUrl: './tech-banner.component.html',
  styleUrls: ['./tech-banner.component.css'],
})
export class TechBannerComponent {
  technologies = input.required<Technology[]>();
  direction = input<'left' | 'right'>('left');
  speed = input<number>(20); // seconds
  showStars = input<boolean>(false);

  protected displayItems = computed(() => {
    const source = this.technologies();
    const items: Technology[] = [];
    for (let i = 0; i < 4; i++) {
      items.push(...source);
    }
    return items;
  });

  protected isGoodAt(tech: Technology): boolean {
    return Math.floor(tech.proficiency ?? 0) === (tech.proficiency ?? 0); // 1.5, 2.5 means exposed, 1, 2 means proficient, etc
  }

  createRange(n: number | undefined): number[] {
    return new Array((n ?? 0) > 0 ? Math.floor(n ?? 0) : 0);
  }
}
