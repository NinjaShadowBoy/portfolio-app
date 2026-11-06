import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Project } from '../../../core/interfaces/project.interface';
import { CarouselComponent } from '../carousel/carousel.component';
import { TechTagsComponent } from '../tech-tags/tech-tags.component';
import { ProjectLinksComponent, presentLink } from '../project-links/project-links.component';

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

  readonly hasPhotos = computed(() => (this.project().photoUrls?.length ?? 0) > 0);

  readonly hasLinks = computed(
    () => presentLink(this.project().githubLink) !== null || presentLink(this.project().demoLink) !== null
  );

  /** First letter of the name, shown on the placeholder when there are no photos. */
  readonly monogram = computed(() => this.project().name.trim().charAt(0).toUpperCase());
}
