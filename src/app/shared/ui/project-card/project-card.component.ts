import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Project } from '../../../core/interfaces/project.interface';
import { CarouselComponent } from '../carousel/carousel.component';
import { TechTagsComponent } from '../tech-tags/tech-tags.component';
import { ProjectLinksComponent, presentLink } from '../project-links/project-links.component';
import { projectText } from '../../../core/utils/project-locale';
import { paperForProject } from '../../../features/articles/publications';

/**
 * A project in a card grid. The media area keeps its own carousel controls;
 * the body below it is one stretched link to the project page; the GitHub and
 * live-site links sit in a separate footer so no link is nested in another.
 */
@Component({
  selector: 'app-project-card',
  imports: [RouterLink, CarouselComponent, TechTagsComponent, ProjectLinksComponent],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css',
})
export class ProjectCardComponent {
  project = input.required<Project>();
  /** Off in a section that already says the projects are featured. */
  showFeaturedBadge = input(true);

  private readonly locale = inject(LOCALE_ID);

  readonly hasPhotos = computed(() => (this.project().photoUrls?.length ?? 0) > 0);

  /** The description in the page's language, without its "Period:" line, which is noise in a card. */
  readonly description = computed(() => projectText(this.project(), this.locale).description);

  readonly paper = computed(() => paperForProject(this.project().name));

  readonly hasLinks = computed(
    () =>
      presentLink(this.project().githubLink) !== null ||
      presentLink(this.project().demoLink) !== null ||
      this.paper() !== null
  );

  /** First letter of the name, shown on the placeholder when there are no photos. */
  readonly monogram = computed(() => this.project().name.trim().charAt(0).toUpperCase());
}
