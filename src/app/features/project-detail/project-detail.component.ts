import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ProjectDataService } from '../../core/services/project-data.service';
import { Project } from '../../core/interfaces/project.interface';
import { CarouselComponent } from '../../shared/ui/carousel/carousel.component';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';
import { TechnologiesService } from '../../core/services/technologies.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, CarouselComponent, FeedbackComponent],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
})
export class ProjectDetailComponent {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);
  private techService = inject(TechnologiesService);

  private projectId = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('id');
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
      })
    ),
    { initialValue: null }
  );

  readonly project = computed<Project | undefined>(() => {
    const id = this.projectId();
    return id ? this.projectService.getProject(id) : undefined;
  });

  getTechIcon(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.logo;
  }

  getTechDocUrl(techName: string): string | undefined {
    return this.techService.getTechnology(techName)?.docUrl;
  }
}
