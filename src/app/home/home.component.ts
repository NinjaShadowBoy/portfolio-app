import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectDataService } from '../services/project-data.service';
import { Project } from '../interfaces/project.interface';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  private projectService = inject(ProjectDataService);
  readonly featuredProjects = this.projectService.featuredProjects;
}
