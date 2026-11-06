import { Component, LOCALE_ID, computed, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ProjectDataService } from '../../core/services/project-data.service';
import { CarouselComponent } from '../../shared/ui/carousel/carousel.component';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';
import { TechTagsComponent } from '../../shared/ui/tech-tags/tech-tags.component';
import { ProjectLinksComponent, presentLink } from '../../shared/ui/project-links/project-links.component';
import { projectText } from '../../core/utils/project-locale';
import { pageTitle } from '../../core/services/app-title-strategy';
import { paperForProject } from '../articles/publications';

@Component({
  selector: 'app-project-detail',
  imports: [CarouselComponent, FeedbackComponent, TechTagsComponent, ProjectLinksComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent {
  private projectService = inject(ProjectDataService);
  private locale = inject(LOCALE_ID);

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
    const paper = paperForProject(project.name);
    return {
      ...projectText(project, this.locale),
      technologies: (project.technologies ?? []).map((t) => t.trim()).filter(Boolean),
      photoUrls: (project.photoUrls ?? []).filter((url) => url?.trim()),
      paper,
      hasLinks: presentLink(project.githubLink) !== null || presentLink(project.demoLink) !== null || paper !== null,
    };
  });

  constructor() {
    // Runs after the router's title strategy, so the project's name wins.
    const title = inject(Title);
    effect(() => {
      const name = this.project()?.name;
      if (name) title.setTitle(pageTitle(name));
    });
  }
}
