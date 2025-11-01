import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../interfaces/project.interface';
import { CtaButtonComponent } from '../cta-button/cta-button.component';

@Component({
  selector: 'app-featured-card',
  standalone: true,
  imports: [CommonModule, CtaButtonComponent],
  templateUrl: './featured-card.component.html',
  styleUrls: ['./featured-card.component.css'],
})
export class FeaturedCardComponent {
  @Input({ required: true }) project!: Project;
}
