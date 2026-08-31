import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectDataService } from '../../core/services/project-data.service';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';
import { LazyLoadDirective } from '../../core/directives/lazy-load.directive';
import { TechnologiesService, Technology } from '../../core/services/technologies.service';

interface Pillar {
  tech: Technology[];
  radius: number; // px radius of the orbiting ring, sized to the item count
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectCardComponent, LazyLoadDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  private projectService = inject(ProjectDataService);
  private techService = inject(TechnologiesService);

  readonly featuredProjects = this.projectService.featuredProjects;

  // Three homes for the code -  the tools I reach for wherever it runs.
  readonly server = this.pillar(['Spring Boot', 'Gin', 'PostgreSQL', 'MySQL', 'Docker']);
  readonly browser = this.pillar(['Angular', 'Nuxt', 'TypeScript', 'Playwright']);
  readonly phone = this.pillar(['Expo React Native', 'Jetpack Compose']);

  private pillar(names: string[]): Pillar {
    const tech = names.map((n) => this.techService.getTechnology(n)!).filter(Boolean);
    // Radius that keeps neighbouring logos from overlapping as the count grows.
    const radius = tech.length <= 1 ? 0 : Math.round(58 / Math.sin(Math.PI / tech.length));
    return { tech, radius };
  }
}
