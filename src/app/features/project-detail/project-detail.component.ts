import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ProjectDataService } from '../../core/services/project-data.service';
import { CarouselComponent } from '../../shared/ui/carousel/carousel.component';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';
import { TechTagsComponent } from '../../shared/ui/tech-tags/tech-tags.component';
import { ProjectLinksComponent, presentLink } from '../../shared/ui/project-links/project-links.component';

/** Trimmed text, or empty when the value is missing or blank. */
function text(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

@Component({
  selector: 'app-project-detail',
  imports: [DatePipe, CarouselComponent, FeedbackComponent, TechTagsComponent, ProjectLinksComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent {
  private projectService = inject(ProjectDataService);

  private projectId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN }
  );

  /** Undefined until the projects load, or when the id matches nothing. */
  readonly project = computed(() => this.projectService.getProject(this.projectId()));

  /**
   * The project's content with blanks removed. A section renders only when its
   * value here is non-empty, so the page never shows an empty heading.
   */
  readonly content = computed(() => {
    const project = this.project();
    if (!project) return null;
    return {
      description: text(project.description),
      challenges: text(project.challenges),
      whatILearned: text(project.whatILearned),
      technologies: (project.technologies ?? []).map((t) => t.trim()).filter(Boolean),
      photoUrls: (project.photoUrls ?? []).filter((url) => url?.trim()),
      hasLinks: presentLink(project.githubLink) !== null || presentLink(project.demoLink) !== null,
      updated: project.updatedAt && project.updatedAt !== project.createdAt ? project.updatedAt : null,
    };
  });
}
