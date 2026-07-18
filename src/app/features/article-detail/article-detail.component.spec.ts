import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LOCALE_ID, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Meta, Title } from '@angular/platform-browser';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ArticleDetailComponent } from './article-detail.component';
import { ArticleDataService } from '../../core/services/article-data.service';
import { ProjectDataService } from '../../core/services/project-data.service';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';
import {
  ArticleLang,
  ArticlePayload,
  ArticleSummary,
} from '../../core/interfaces/article.interface';

/**
 * The detail page derives the manifest summary synchronously (build-imported) and
 * fetches the rendered payload for the body/TOC. We stub both data services so the
 * test controls the article, and assert the layout renders plus the SEO surface
 * (title, meta description, Open Graph, JSON-LD, hreflang) is emitted and the
 * feedback component is mounted with the article slug.
 */
describe('ArticleDetailComponent', () => {
  let fixture: ComponentFixture<ArticleDetailComponent>;

  const summary: ArticleSummary = {
    slug: 'hello-world',
    title: 'Hello World',
    description: 'A friendly introduction to the writing system.',
    date: '2026-07-01',
    updated: '2026-07-10',
    tags: ['Angular', 'SSR'],
    coverImage: 'cover.png',
    readingTime: 5,
    langs: ['en', 'fr'],
    connections: {
      relatedArticles: [],
      relatedProjects: [],
      researchPapers: [],
    },
  };

  const payload: ArticlePayload = {
    slug: 'hello-world',
    lang: 'en',
    title: 'Hello World',
    description: 'A friendly introduction to the writing system.',
    html: '<h2 id="intro">Intro</h2><p>Body text from the payload.</p>',
    toc: [{ id: 'intro', text: 'Intro', level: 2, children: [] }],
    notTranslated: false,
  };

  const articleDataStub = {
    articles: signal<ArticleSummary[]>([summary]),
    getArticleSummary: (slug: string) =>
      slug === summary.slug ? summary : undefined,
    getArticle: (_slug: string, _lang: ArticleLang) => of(payload),
  };

  const projectDataStub = {
    projects: signal([]),
  };

  async function setup(slug = 'hello-world'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ArticleDetailComponent, RouterTestingModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en' },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug })) },
        },
        { provide: ArticleDataService, useValue: articleDataStub },
        { provide: ProjectDataService, useValue: projectDataStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleDetailComponent);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the title and meta row from the manifest summary', async () => {
    await setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.article-detail-header h1')?.textContent).toContain(
      'Hello World',
    );
    const meta = el.querySelector('.article-detail-meta')?.textContent ?? '';
    expect(meta).toContain('5 min read');
    const tags = Array.from(el.querySelectorAll('.tag')).map((t) =>
      t.textContent?.trim(),
    );
    expect(tags).toEqual(['Angular', 'SSR']);
  });

  it('renders the highlighted body from the payload', async () => {
    await setup();
    await fixture.whenStable();
    fixture.detectChanges();

    const body = (fixture.nativeElement as HTMLElement).querySelector(
      '.article-body',
    );
    expect(body?.innerHTML).toContain('Body text from the payload.');
    expect(body?.querySelector('h2#intro')).toBeTruthy();
  });

  it('sets the document title and meta description', async () => {
    await setup();
    const title = TestBed.inject(Title);
    const meta = TestBed.inject(Meta);
    expect(title.getTitle()).toContain('Hello World');
    expect(meta.getTag('name="description"')?.content).toBe(summary.description);
  });

  it('emits Open Graph and Twitter Card tags', async () => {
    await setup();
    const meta = TestBed.inject(Meta);
    expect(meta.getTag('property="og:type"')?.content).toBe('article');
    expect(meta.getTag('property="og:title"')?.content).toBe('Hello World');
    expect(meta.getTag('property="og:url"')?.content).toContain(
      '/articles/hello-world',
    );
    expect(meta.getTag('property="og:image"')?.content).toContain('cover.png');
    expect(meta.getTag('name="twitter:card"')?.content).toBe(
      'summary_large_image',
    );
  });

  it('emits a canonical link and JSON-LD Article structured data', async () => {
    await setup();
    const head = document.head;

    const canonical = head.querySelector<HTMLLinkElement>(
      'link[data-seo="canonical"]',
    );
    expect(canonical?.getAttribute('href')).toContain('/articles/hello-world');

    const jsonLd = head.querySelector('script[data-seo="jsonld"]');
    expect(jsonLd).toBeTruthy();
    const data = JSON.parse(jsonLd?.textContent ?? '{}');
    expect(data['@type']).toBe('Article');
    expect(data.headline).toBe('Hello World');
    expect(data.datePublished).toBe('2026-07-01');
    expect(data.author?.name).toBeTruthy();
  });

  it('emits hreflang alternates for en and fr with an x-default', async () => {
    await setup();
    const head = document.head;
    const hreflangs = Array.from(
      head.querySelectorAll('link[data-seo^="hreflang-"]'),
    ).map((l) => l.getAttribute('hreflang'));

    expect(hreflangs).toContain('en');
    expect(hreflangs).toContain('fr');
    expect(hreflangs).toContain('x-default');

    const fr = head.querySelector('link[data-seo="hreflang-fr"]');
    expect(fr?.getAttribute('href')).toContain('/fr/articles/hello-world');
  });

  it('mounts the feedback component with the article slug', async () => {
    await setup();
    const feedback = fixture.debugElement.query(By.directive(FeedbackComponent));
    expect(feedback).toBeTruthy();
    expect(feedback.componentInstance.articleSlug()).toBe('hello-world');
  });

  it('shows a not-found message for an unknown slug', async () => {
    await setup('does-not-exist');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.not-found')).toBeTruthy();
    expect(el.querySelector('.article-detail')).toBeNull();
  });
});
