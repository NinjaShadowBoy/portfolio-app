import { Component, DestroyRef, computed, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjectDataService } from '../../core/services/project-data.service';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';
import { TechnologiesService, Technology } from '../../core/services/technologies.service';

const FEATURED_ON_HOME = 4;

interface Pillar {
  tech: Technology[];
  radius: number; // px radius of the orbiting ring, sized to the item count
}

@Component({
  selector: 'app-home',
  imports: [NgTemplateOutlet, RouterLink, ProjectCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private projectService = inject(ProjectDataService);
  private techService = inject(TechnologiesService);
  private arsenal = viewChild.required<ElementRef<HTMLElement>>('arsenal');

  /** The first featured projects in display order; the rest are on /projects. */
  readonly featuredProjects = computed(() => this.projectService.featuredProjects().slice(0, FEATURED_ON_HOME));

  /** False while the rings are off-screen, so their animation is paused instead of recalculated every frame. */
  readonly arsenalVisible = signal(true);

  // Three homes for the code -  the tools I reach for wherever it runs.
  readonly server = this.pillar(['Spring Boot', 'Gin', 'PostgreSQL', 'MySQL', 'Docker']);
  readonly browser = this.pillar(['Angular', 'Nuxt', 'TypeScript', 'Playwright']);
  readonly phone = this.pillar(['Expo React Native', 'Jetpack Compose']);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // afterNextRender never runs on the server, so SSR output keeps the rings running.
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(([entry]) => this.arsenalVisible.set(entry.isIntersecting));
      observer.observe(this.arsenal().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private pillar(names: string[]): Pillar {
    const tech = names.map((n) => this.techService.getTechnology(n)!).filter(Boolean);
    // Radius that keeps neighbouring logos from overlapping as the count grows.
    const radius = tech.length <= 1 ? 0 : Math.round(58 / Math.sin(Math.PI / tech.length));
    return { tech, radius };
  }
}
