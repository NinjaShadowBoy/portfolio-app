import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../interfaces/project.interface';
import { CtaButtonComponent } from '../cta-button/cta-button.component';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, CtaButtonComponent],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.css'],
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Input() maxDescriptionLength = 150; // Maximum characters for description

  getTruncatedDescription(): string {
    if (!this.project.description) return '';

    if (this.project.description.length <= this.maxDescriptionLength) {
      return this.project.description;
    }

    return this.project.description.substring(0, this.maxDescriptionLength).trim() + '...';
  }
}
