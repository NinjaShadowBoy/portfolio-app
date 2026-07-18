import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ArticleConnections,
  ArticleSummary,
  ResearchPaper,
} from '../../../core/interfaces/article.interface';
import { Project } from '../../../core/interfaces/project.interface';
import { ArticleDataService } from '../../../core/services/article-data.service';
import { ProjectDataService } from '../../../core/services/project-data.service';
import { ArticleCardComponent } from '../article-card/article-card.component';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { CtaButtonComponent } from '../cta-button/cta-button.component';

/**
 * Connections block — the cross-linking footer of an article detail page.
 *
 * Renders the `connections` object carried by an {@link ArticleSummary} (related
 * article slugs, related project ids, research papers, and an optional LinkedIn
 * cross-post) as a single section panel, mirroring the project-detail
 * section-panel language (surface-raised + border-subtle + elevation-1 + h2
 * accent bar). Related content is resolved to full summaries/records via the
 * shared data services and rendered with the existing card components; papers
 * and the LinkedIn post render as links.
 *
 * Empty sub-sections are hidden, and the whole block is omitted when nothing is
 * connected. Standalone, signal-input based, styled entirely from design tokens.
 */
@Component({
  selector: 'app-connections',
  standalone: true,
  imports: [
    CommonModule,
    ArticleCardComponent,
    ProjectCardComponent,
    CtaButtonComponent,
  ],
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.css'],
})
export class ConnectionsComponent {
  private articleData = inject(ArticleDataService);
  private projectData = inject(ProjectDataService);

  /** The connections object from the article manifest row. */
  connections = input.required<ArticleConnections>();

  /**
   * Resolve related-article slugs to manifest summaries, dropping any slug that
   * does not resolve (unknown or draft article).
   */
  readonly relatedArticles = computed<ArticleSummary[]>(() => {
    const slugs = this.connections().relatedArticles ?? [];
    return slugs
      .map((slug) => this.articleData.getArticleSummary(slug))
      .filter((article): article is ArticleSummary => article !== undefined);
  });

  /**
   * Resolve related-project ids to full project records. Reads the projects
   * signal so this recomputes once the async project data resolves; unknown ids
   * are dropped.
   */
  readonly relatedProjects = computed<Project[]>(() => {
    const ids = this.connections().relatedProjects ?? [];
    const projects = this.projectData.projects();
    return ids
      .map((id) => projects.find((project) => project.id === Number(id)))
      .filter((project): project is Project => project !== undefined);
  });

  /** Research papers referenced by this article (may be empty). */
  readonly researchPapers = computed<ResearchPaper[]>(
    () => this.connections().researchPapers ?? [],
  );

  /** LinkedIn cross-post URL, when one exists. */
  readonly linkedInUrl = computed<string | undefined>(
    () => this.connections().linkedInUrl,
  );

  readonly hasArticles = computed(() => this.relatedArticles().length > 0);
  readonly hasProjects = computed(() => this.relatedProjects().length > 0);
  readonly hasPapers = computed(() => this.researchPapers().length > 0);
  readonly hasLinkedIn = computed(() => !!this.linkedInUrl());

  /** True when at least one sub-section has content — gates the whole block. */
  readonly hasAny = computed(
    () =>
      this.hasArticles() ||
      this.hasProjects() ||
      this.hasPapers() ||
      this.hasLinkedIn(),
  );

  /** i18n label for the LinkedIn CTA (bound because cta-button takes text as an input). */
  readonly linkedInLabel = $localize`:Connections LinkedIn cross-post link@@connectionsLinkedInLink:Read the LinkedIn post`;
}
