import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ProjectDataService } from '../../core/services/project-data.service';
import { CarouselComponent } from '../../shared/ui/carousel/carousel.component';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';
import { TechTagsComponent } from '../../shared/ui/tech-tags/tech-tags.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [DatePipe, CarouselComponent, FeedbackComponent, TechTagsComponent],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
})
export class ProjectDetailComponent {
  private projectService = inject(ProjectDataService);

  private projectId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN }
  );

  /** Undefined until the projects load, or when the id matches nothing. */
  readonly project = computed(() => this.projectService.getProject(this.projectId()));
}
