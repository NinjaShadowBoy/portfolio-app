import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ProjectDetailComponent } from './project-detail.component';
import { ProjectDataService } from '../../core/services/project-data.service';
import { IdentityService } from '../../core/services/identity.service';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';
import { Project } from '../../core/interfaces/project.interface';

describe('ProjectDetailComponent', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;

  const project: Project = {
    id: 3,
    name: 'Connect Four',
    description: 'A strategy game',
    technologies: ['Angular', 'NoSuchTech'],
    githubLink: 'https://github.com/x/y',
    challenges: 'Board logic',
    whatILearned: 'Animations',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: false,
    photoUrls: [],
  };

  async function setup(id: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
        {
          provide: ProjectDataService,
          useValue: { getProject: (pid: number) => (pid === 3 ? project : undefined), projects: signal([project]) },
        },
        { provide: IdentityService, useValue: { identity: signal(null), refresh: () => {} } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
  }

  it('renders the project matching the route id, with a chip per technology', async () => {
    await setup('3');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Connect Four');
    expect(el.querySelector('.challenges p')?.textContent).toContain('Board logic');

    const chips = el.querySelectorAll('app-tech-tags .tech-tag');
    expect(chips.length).toBe(2);
    expect(chips[0].tagName).toBe('A'); // known technology links to its docs
    expect(chips[1].tagName).toBe('SPAN'); // unknown technology is plain text
  });

  it('mounts the feedback thread for the project', async () => {
    await setup('3');
    const feedback = fixture.debugElement.query(By.directive(FeedbackComponent));
    expect(feedback.componentInstance.projectId()).toBe(3);
  });

  it('shows the not-found state for an unknown id', async () => {
    await setup('999');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.not-found')).toBeTruthy();
    expect(el.querySelector('h1')).toBeNull();
  });
});
