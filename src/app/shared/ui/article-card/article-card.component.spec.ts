import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ArticleCardComponent } from './article-card.component';
import { ArticleSummary } from '../../../core/interfaces/article.interface';

describe('ArticleCardComponent', () => {
  let component: ArticleCardComponent;
  let fixture: ComponentFixture<ArticleCardComponent>;
  let mockArticle: ArticleSummary;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleCardComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleCardComponent);
    component = fixture.componentInstance;

    mockArticle = {
      slug: 'hello-world',
      title: 'Hello World',
      description: 'A first article about the writing system.',
      date: '2026-07-01',
      tags: ['Angular', 'SSR'],
      readingTime: 5,
      langs: ['en'],
      connections: {
        relatedArticles: [],
        relatedProjects: [],
        researchPapers: [],
      },
    };

    // article is a required input signal.
    fixture.componentRef.setInput('article', mockArticle);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the article title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Hello World');
  });

  it('should render the description', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.article-description')?.textContent).toContain(
      'A first article about the writing system.'
    );
  });

  it('should render each tag as a chip', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tags = Array.from(compiled.querySelectorAll('.article-tags .tag')).map(
      (el) => el.textContent?.trim()
    );
    expect(tags).toEqual(['Angular', 'SSR']);
  });

  it('should render the reading time', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('5 min read');
  });

  it('should link to the article detail route via routerLink', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a.cta-button') as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/articles/hello-world');
  });

  it('should not render a cover image when none is provided', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.article-cover')).toBeFalsy();
    expect(component.coverImageUrl()).toBeUndefined();
  });

  it('should resolve a relative cover image against the slug folder', () => {
    fixture.componentRef.setInput('article', { ...mockArticle, coverImage: 'cover.png' });
    fixture.detectChanges();
    expect(component.coverImageUrl()).toBe('/assets/articles/hello-world/cover.png');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.article-cover')).toBeTruthy();
  });

  it('should use an absolute cover image URL as-is', () => {
    fixture.componentRef.setInput('article', {
      ...mockArticle,
      coverImage: 'https://cdn.example.com/cover.png',
    });
    fixture.detectChanges();
    expect(component.coverImageUrl()).toBe('https://cdn.example.com/cover.png');
  });
});
