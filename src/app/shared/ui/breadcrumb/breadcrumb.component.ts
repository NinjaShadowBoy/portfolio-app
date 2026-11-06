import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd, ActivatedRouteSnapshot, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { ProjectDataService } from '../../../core/services/project-data.service';

export interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * Builds the trail from each activated route's `breadcrumb` data; project ids
 * resolve to names. A trail of one crumb says nothing the page heading does
 * not, so it is not shown.
 */
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css',
})
export class BreadcrumbComponent {
  private router = inject(Router);
  private projectService = inject(ProjectDataService);

  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
  );

  /** Recomputed on each navigation and when the projects load, so a direct visit shows the project name. */
  readonly breadcrumbs = computed(() => {
    this.navigation();
    this.projectService.projects();
    // The snapshot tree is complete at all times; the live ActivatedRoute tree
    // is not while a navigation is under way, which is when the projects can load.
    const crumbs = this.buildBreadcrumbs(this.router.routerState.snapshot.root);
    return crumbs.length > 1 ? crumbs : [];
  });

  private buildBreadcrumbs(route: ActivatedRouteSnapshot, url = '', crumbs: Breadcrumb[] = []): Breadcrumb[] {
    const child = route.children[0];
    if (!child) return crumbs;

    const segment = child.url.map((s) => s.path).join('/');
    if (segment === '') return crumbs;
    url += `/${segment}`;

    const projectId = child.params['id'];
    const label = projectId
      ? this.projectService.getProject(projectId)?.name || child.data['breadcrumb'] || ''
      : child.data['breadcrumb'] || '';
    if (label) crumbs.push({ label, url });

    return this.buildBreadcrumbs(child, url, crumbs);
  }
}
