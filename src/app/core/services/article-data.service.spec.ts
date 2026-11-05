import { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ArticleDataService } from './article-data.service';
import { ArticleContentLoader } from './article-content-loader';
import { ArticleLang, ArticlePayload } from '../interfaces/article.interface';

describe('ArticleDataService', () => {
  let service: ArticleDataService;
  let load: Mock;

  const payload = (slug: string, lang: ArticleLang): ArticlePayload => ({
    slug,
    lang,
    title: 'T',
    description: 'D',
    html: '<p>x</p>',
    toc: [],
    notTranslated: false,
  });

  beforeEach(() => {
    load = vi.fn().mockName('load').mockImplementation((slug: string, lang: ArticleLang) => of(payload(slug, lang)));
    TestBed.configureTestingModule({
      providers: [{ provide: ArticleContentLoader, useValue: { load } }],
    });
    service = TestBed.inject(ArticleDataService);
  });

  it('serves the English payload flagged notTranslated when the requested locale is unavailable', () => {
    let result: ArticlePayload | null = null;
    service.getArticle('unknown-slug', 'fr').subscribe((r) => (result = r));

    expect(load).toHaveBeenCalledWith('unknown-slug', 'en');
    expect(result).toEqual(expect.objectContaining({ lang: 'en', notTranslated: true }));
  });

  it('serves English without the fallback flag', () => {
    let result: ArticlePayload | null = null;
    service.getArticle('unknown-slug', 'en').subscribe((r) => (result = r));

    expect(result).toEqual(expect.objectContaining({ lang: 'en', notTranslated: false }));
  });

  it('passes a missing payload through as null', () => {
    load.mockReturnValue(of(null));
    let result: ArticlePayload | null | undefined;
    service.getArticle('gone', 'en').subscribe((r) => (result = r));

    expect(result).toBeNull();
  });
});
