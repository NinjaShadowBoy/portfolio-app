import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() isAdmin = false;
  @Input() canRate = false;

  @Output() toggleDetails = new EventEmitter<Project>();
  @Output() addRating = new EventEmitter<{ project: Project; rating: number }>();
  @Output() resetRatings = new EventEmitter<Project>();

  onToggleDetails(): void {
    this.toggleDetails.emit(this.project);
  }

  onAddRating(rating: number): void {
    this.addRating.emit({ project: this.project, rating });
  }

  onResetRatings(): void {
    this.resetRatings.emit(this.project);
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getRatingClass(star: number, averageRating: number): string {
    if (averageRating >= star) return 'star-filled';
    if (averageRating >= star - 0.5) return 'star-half';
    return 'star-empty';
  }
}
