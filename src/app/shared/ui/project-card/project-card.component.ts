import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Project } from '../../../core/interfaces/project.interface';
import { CtaButtonComponent } from '../cta-button/cta-button.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { TechTagsComponent } from '../tech-tags/tech-tags.component';

@Component({
  selector: 'app-project-card',
  imports: [DatePipe, CtaButtonComponent, CarouselComponent, TechTagsComponent],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css',
})
export class ProjectCardComponent {
  project = input.required<Project>();
  /** Descriptions longer than this are cut and suffixed with an ellipsis. */
  maxDescriptionLength = input(150);

  readonly truncatedDescription = computed(() => {
    const desc = this.project().description ?? '';
    const max = this.maxDescriptionLength();
    return desc.length <= max ? desc : desc.substring(0, max).trim() + '...';
  });
}
