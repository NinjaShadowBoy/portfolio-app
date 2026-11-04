import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { BreadcrumbComponent } from './breadcrumb.component';
import { ProjectDataService } from '../../../core/services/project-data.service';

@Component({ standalone: true, template: '' })
class BlankComponent {}

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let router: Router;

  const crumbs = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li')).map((li) => ({
      label: li.textContent?.trim(),
      href: li.querySelector('a')?.getAttribute('href') ?? null,
    }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [
        provideRouter([
          { path: 'home', component: BlankComponent, data: { breadcrumb: 'Home' } },
          {
            path: 'projects',
            data: { breadcrumb: 'Projects' },
            children: [
              { path: '', component: BlankComponent },
              { path: ':id', component: BlankComponent, data: { breadcrumb: 'Project Details' } },
            ],
          },
        ]),
        {
          provide: ProjectDataService,
          useValue: { getProject: (id: string) => (Number(id) === 1 ? { name: 'Lora' } : undefined) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges(); // subscribe before navigating so NavigationEnd is observed
  });

  async function navigate(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture.detectChanges();
  }

  it('renders one crumb per route level, linking all but the last', async () => {
    await navigate('/projects/1');
    expect(crumbs()).toEqual([
      { label: 'Projects', href: '/projects' },
      { label: 'Lora', href: null },
    ]);
  });

  it('falls back to the route label when the project is unknown', async () => {
    await navigate('/projects/42');
    expect(crumbs().map((c) => c.label)).toEqual(['Projects', 'Project Details']);
  });

  it('renders a single crumb for a top-level page', async () => {
    await navigate('/home');
    expect(crumbs()).toEqual([{ label: 'Home', href: null }]);
  });
});
