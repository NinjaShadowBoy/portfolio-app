import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectDataService } from '../services/project-data.service';
import { FeaturedCardComponent } from '../featured-card/featured-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FeaturedCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  private projectService = inject(ProjectDataService);
  readonly featuredProjects = this.projectService.featuredProjects;
}
