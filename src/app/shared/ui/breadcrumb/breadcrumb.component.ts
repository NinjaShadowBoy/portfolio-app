import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { ProjectDataService } from '../../../core/services/project-data.service';

export interface Breadcrumb {
  label: string;
  url: string;
}

/** Builds the trail from each activated route's `breadcrumb` data; project ids resolve to names. */
@Component({
  selector: 'app-breadcrumb',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css',
})
export class BreadcrumbComponent {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);

  readonly breadcrumbs = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map(() => this.buildBreadcrumbs(this.activatedRoute.root))
  );

  private buildBreadcrumbs(route: ActivatedRoute, url = '', crumbs: Breadcrumb[] = []): Breadcrumb[] {
    const child = route.children[0];
    if (!child) return crumbs;

    const segment = child.snapshot.url.map((s) => s.path).join('/');
    if (segment === '') return crumbs;
    url += `/${segment}`;

    const projectId = child.snapshot.params['id'];
    const label = projectId
      ? this.projectService.getProject(projectId)?.name ||
        $localize`:@@breadcrumbProjectDetails:Project Details`
      : child.snapshot.data['breadcrumb'] || '';
    if (label) crumbs.push({ label, url });

    return this.buildBreadcrumbs(child, url, crumbs);
  }
}
