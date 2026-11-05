import { Component, computed, inject, input } from '@angular/core';
import {
  ArticleConnections,
  ArticleSummary,
} from '../../../core/interfaces/article.interface';
import { Project } from '../../../core/interfaces/project.interface';
import { ArticleDataService } from '../../../core/services/article-data.service';
import { ProjectDataService } from '../../../core/services/project-data.service';
import { ArticleCardComponent } from '../article-card/article-card.component';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { CtaButtonComponent } from '../cta-button/cta-button.component';

/**
 * Connections block: the cross-linking footer of an article detail page.
 * Related article slugs and project ids are resolved through the shared data
 * services (unknown ones are dropped); papers and the LinkedIn cross-post
 * render as links. Empty sub-sections are hidden, and the whole block is
 * omitted when nothing is connected.
 */
@Component({
  selector: 'app-connections',
  imports: [ArticleCardComponent, ProjectCardComponent, CtaButtonComponent],
  templateUrl: './connections.component.html',
  styleUrl: './connections.component.css',
})
export class ConnectionsComponent {
  private articleData = inject(ArticleDataService);
  private projectData = inject(ProjectDataService);

  connections = input.required<ArticleConnections>();

  readonly relatedArticles = computed<ArticleSummary[]>(() =>
    (this.connections().relatedArticles ?? [])
      .map((slug) => this.articleData.getArticleSummary(slug))
      .filter((article) => article !== undefined)
  );

  /** Reads the projects signal so it recomputes once the async data resolves. */
  readonly relatedProjects = computed<Project[]>(() => {
    const projects = this.projectData.projects();
    return (this.connections().relatedProjects ?? [])
      .map((id) => projects.find((project) => project.id === Number(id)))
      .filter((project) => project !== undefined);
  });

  readonly researchPapers = computed(() => this.connections().researchPapers ?? []);
  readonly linkedInUrl = computed(() => this.connections().linkedInUrl);

  readonly hasArticles = computed(() => this.relatedArticles().length > 0);
  readonly hasProjects = computed(() => this.relatedProjects().length > 0);
  readonly hasPapers = computed(() => this.researchPapers().length > 0);
  readonly hasLinkedIn = computed(() => !!this.linkedInUrl());
  readonly hasAny = computed(
    () => this.hasArticles() || this.hasProjects() || this.hasPapers() || this.hasLinkedIn()
  );

  /** Bound because cta-button takes its text as an input. */
  readonly linkedInLabel = $localize`:Connections LinkedIn cross-post link@@connectionsLinkedInLink:Read the LinkedIn post`;
}
