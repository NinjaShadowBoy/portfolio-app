import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../../core/interfaces/project.interface';
import { CtaButtonComponent } from '../cta-button/cta-button.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { TechnologiesService } from '../../../core/services/technologies.service';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, CtaButtonComponent, CarouselComponent],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.css'],
})
export class ProjectCardComponent {
  private techService = inject(TechnologiesService);

  project = input.required<Project>();
  maxDescriptionLength = input<number>(150); // Maximum characters for description

  getTruncatedDescription(): string {
    const desc = this.project().description;
    const maxLength = this.maxDescriptionLength();

    if (!desc) return '';

    if (desc.length <= maxLength) {
      return desc;
    }

    return desc.substring(0, maxLength).trim() + '...';
  }

  getTechIcon(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.logo;
  }

  getTechDocUrl(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.docUrl;
  }
}
