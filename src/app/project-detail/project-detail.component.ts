import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProjectDataService } from '../services/project-data.service';
import { Project } from '../interfaces/project.interface';
import { environment } from '../../environments/environment';

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
  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  constructor() {
    this.route.params.subscribe((params) => {
      this.project = this.projectService.getProject(params['id']);
    });
  }

  getPhotoUrl(photoUrl: string): string {
    return this.apiBaseUrl + photoUrl;
  }
}
