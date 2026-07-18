import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { ArticlesComponent } from './articles.component';
import { ArticleDataService } from '../../core/services/article-data.service';
import { ArticleSummary } from '../../core/interfaces/article.interface';

/**
 * The index page reads its list straight from {@link ArticleDataService.articles},
 * which the build fills from the manifest with drafts already excluded. We stub the
 * service with a signal-backed `articles` list so the test controls exactly what the
 * page renders — proving one card per manifest entry (and that a draft, which never
 * reaches the manifest, therefore never reaches the page).
 */
describe('ArticlesComponent', () => {
  let fixture: ComponentFixture<ArticlesComponent>;

  const makeArticle = (slug: string, title: string): ArticleSummary => ({
    slug,
    title,
    description: `${title} description`,
    date: '2026-07-01',
    tags: ['Angular'],
    readingTime: 4,
    langs: ['en'],
    connections: {
      relatedArticles: [],
      relatedProjects: [],
      researchPapers: [],
    },
  });

  const manifest = signal<ArticleSummary[]>([]);

  async function setup(articles: ArticleSummary[]): Promise<void> {
    manifest.set(articles);
    await TestBed.configureTestingModule({
      imports: [ArticlesComponent, RouterTestingModule],
      providers: [
        {
          provide: ArticleDataService,
          useValue: { articles: manifest },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticlesComponent);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one card per manifest entry (drafts already excluded at build)', async () => {
    await setup([
      makeArticle('hello-world', 'Hello World'),
      makeArticle('en-only', 'English Only'),
    ]);

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-article-card');
    expect(cards.length).toBe(2);

    const titles = Array.from(compiled.querySelectorAll('app-article-card h3')).map(
      (el) => el.textContent?.trim()
    );
    expect(titles).toEqual(['Hello World', 'English Only']);
  });

  it('should render the page heading', async () => {
    await setup([makeArticle('hello-world', 'Hello World')]);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.articles-header h1')?.textContent).toContain(
      'Articles'
    );
  });

  it('should show the empty state and no cards when there are no articles', async () => {
    await setup([]);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('app-article-card').length).toBe(0);
    expect(compiled.querySelector('.no-results')).toBeTruthy();
    expect(compiled.querySelector('.no-results h3')?.textContent).toContain(
      'No articles yet'
    );
  });
});
