import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectDataService } from '../../core/services/project-data.service';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';
import { LazyLoadDirective } from '../../core/directives/lazy-load.directive';
import { TechBannerComponent } from '../../shared/ui/tech-banner/tech-banner.component';
import { TechnologiesService, Technology } from '../../core/services/technologies.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProjectCardComponent, LazyLoadDirective, TechBannerComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  private projectService = inject(ProjectDataService);
  private techService = inject(TechnologiesService);

  readonly featuredProjects = this.projectService.featuredProjects;

  // Fetch technologies using the technologies service
  readonly languages: Technology[] = [
    this.techService.getTechnology('TypeScript')!,
    this.techService.getTechnology('JavaScript')!,
    this.techService.getTechnology('Java')!,
    this.techService.getTechnology('Kotlin')!,
    this.techService.getTechnology('Python')!,
    this.techService.getTechnology('Go')!,
    this.techService.getTechnology('C')!,
    this.techService.getTechnology('C++')!,
    this.techService.getTechnology('HTML5')!,
    this.techService.getTechnology('CSS3')!,
  ].filter(Boolean);

  readonly frameworks: Technology[] = [
    this.techService.getTechnology('Angular')!,
    this.techService.getTechnology('React')!,
    this.techService.getTechnology('Spring Boot')!,
    this.techService.getTechnology('NestJS')!,
    this.techService.getTechnology('Ktor')!,
    this.techService.getTechnology('Jetpack Compose')!,
  ].filter(Boolean);

  readonly tools: Technology[] = [
    this.techService.getTechnology('Git')!,
    this.techService.getTechnology('Docker')!,
    this.techService.getTechnology('PostgreSQL')!,
    this.techService.getTechnology('MySQL')!,
    this.techService.getTechnology('MongoDB')!,
    this.techService.getTechnology('ChatGPT')!,
    this.techService.getTechnology('Linux')!,
    this.techService.getTechnology('Gradle')!,
    this.techService.getTechnology('npm')!,
    this.techService.getTechnology('Playwright')!,
  ].filter(Boolean);
}

