import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProjectDataService } from '../services/project-data.service';
import { Project } from '../interfaces/project.interface';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
})
export class ProjectDetailComponent {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);
  project: Project | undefined;

  constructor() {
    this.route.params.subscribe((params) => {
      this.project = this.projectService.getProject(params['id']);
    });
  }
}
