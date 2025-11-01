import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../interfaces/project.interface';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule],
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

  getRatingCount(rating: number): number {
    return this.project.ratings.filter((r) => r.rating === rating).length;
  }

  getRatingPercentage(rating: number): number {
    if (this.project.ratings.length === 0) return 0;
    return (this.getRatingCount(rating) / this.project.ratings.length) * 100;
  }
}
