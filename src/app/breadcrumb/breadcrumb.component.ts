import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { ProjectDataService } from './../services/project-data.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css'],
})
export class BreadcrumbComponent {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private projectService = inject(ProjectDataService);

  breadcrumbs = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map(() => this.buildBreadcrumbs(this.activatedRoute.root))
  );

  private buildBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: { label: string; url: string }[] = []
  ): { label: string; url: string }[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url
        .map((segment) => segment.path)
        .join('/');

      if (routeURL === '') {
        return breadcrumbs;
      }

      url += `/${routeURL}`;

      let label = child.snapshot.data['breadcrumb'] || '';

      if (child.snapshot.params['id']) {
        const projectId = child.snapshot.params['id'];
        const project = this.projectService.getProject(projectId);
        label = project?.name || 'Project Details';
      }

      if (label) {
        breadcrumbs.push({ label, url });
      }

      return this.buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }
}
