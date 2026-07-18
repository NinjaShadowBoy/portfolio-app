import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ConnectionsComponent } from './connections.component';
import {
  ArticleConnections,
  ArticleSummary,
} from '../../../core/interfaces/article.interface';
import { Project } from '../../../core/interfaces/project.interface';
import { ArticleDataService } from '../../../core/services/article-data.service';
import { ProjectDataService } from '../../../core/services/project-data.service';

function makeSummary(slug: string): ArticleSummary {
  return {
    slug,
    title: `Title ${slug}`,
    description: 'desc',
    date: '2026-01-01',
    tags: [],
    readingTime: 2,
    langs: ['en'],
    connections: {
      relatedArticles: [],
      relatedProjects: [],
      researchPapers: [],
    },
  };
}

function makeProject(id: number): Project {
  return {
    id,
    name: `Project ${id}`,
    description: 'desc',
    technologies: [],
    githubLink: '',
    challenges: '',
    whatILearned: '',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: false,
    photoUrls: [],
    isExpanded: false,
  };
}

const EMPTY_CONNECTIONS: ArticleConnections = {
  relatedArticles: [],
  relatedProjects: [],
  researchPapers: [],
};

describe('ConnectionsComponent', () => {
  let fixture: ComponentFixture<ConnectionsComponent>;
  let component: ConnectionsComponent;

  // Stub the two data services so the component resolves related content without
  // the build-generated manifest or a live API.
  const articleStub = {
    getArticleSummary: (slug: string): ArticleSummary | undefined =>
      slug === 'known' ? makeSummary('known') : undefined,
  };
  const projectStub = {
    projects: signal<Project[]>([makeProject(1), makeProject(3)]),
  };

  function setup(connections: ArticleConnections) {
    TestBed.configureTestingModule({
      imports: [ConnectionsComponent],
      providers: [
        provideRouter([]),
        { provide: ArticleDataService, useValue: articleStub },
        { provide: ProjectDataService, useValue: projectStub },
      ],
    });
    fixture = TestBed.createComponent(ConnectionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('connections', connections);
    fixture.detectChanges();
  }

  it('renders nothing when there are no connections', () => {
    setup(EMPTY_CONNECTIONS);
    expect(component.hasAny()).toBe(false);
    expect(fixture.nativeElement.querySelector('.connections')).toBeFalsy();
  });

  it('resolves related-article slugs to summaries and drops unknown ones', () => {
    setup({ ...EMPTY_CONNECTIONS, relatedArticles: ['known', 'missing'] });
    expect(component.relatedArticles().length).toBe(1);
    expect(component.relatedArticles()[0].slug).toBe('known');
    expect(component.hasAny()).toBe(true);
  });

  it('resolves related-project ids to records from the projects signal', () => {
    setup({ ...EMPTY_CONNECTIONS, relatedProjects: [1, 3, 99] });
    expect(component.relatedProjects().map((p) => p.id)).toEqual([1, 3]);
    expect(component.hasProjects()).toBe(true);
  });

  it('exposes research papers and the LinkedIn url', () => {
    setup({
      ...EMPTY_CONNECTIONS,
      researchPapers: [{ title: 'Paper', url: 'https://example.org/p' }],
      linkedInUrl: 'https://www.linkedin.com/posts/example',
    });
    expect(component.hasPapers()).toBe(true);
    expect(component.hasLinkedIn()).toBe(true);
    expect(component.linkedInUrl()).toContain('linkedin.com');
    expect(fixture.nativeElement.querySelector('.connections')).toBeTruthy();
  });
});
