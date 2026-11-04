import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';

import { SeoService } from './seo.service';

describe('SeoService', () => {
  function setup(locale: string): SeoService {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    return TestBed.inject(SeoService);
  }

  const links = () =>
    Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[data-seo]')).map((l) => ({
      key: l.dataset['seo'],
      href: l.getAttribute('href'),
      hreflang: l.getAttribute('hreflang'),
    }));

  afterEach(() => TestBed.inject(SeoService).clear());

  it('builds locale URLs with en at the root and fr under /fr', () => {
    const seo = setup('fr');
    expect(seo.lang).toBe('fr');
    expect(seo.url('/tools')).toBe('https://www.alexabena.me/fr/tools');
    expect(seo.url('/tools', 'en')).toBe('https://www.alexabena.me/tools');
  });

  it('sets title, description, canonical and a full hreflang set by default', () => {
    const seo = setup('en');
    seo.setPage({ title: 'Tools', description: 'Free tools', path: '/tools' });

    expect(TestBed.inject(Title).getTitle()).toBe('Tools');
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe('Free tools');
    expect(links()).toEqual([
      { key: 'canonical', href: 'https://www.alexabena.me/tools', hreflang: null },
      { key: 'hreflang-en', href: 'https://www.alexabena.me/tools', hreflang: 'en' },
      { key: 'hreflang-x-default', href: 'https://www.alexabena.me/tools', hreflang: 'x-default' },
      { key: 'hreflang-fr', href: 'https://www.alexabena.me/fr/tools', hreflang: 'fr' },
    ]);
  });

  it('omits the fr alternate when the page only ships in English', () => {
    const seo = setup('en');
    seo.setPage({ title: 'T', description: 'D', path: '/articles/x', langs: ['en'] });

    expect(links().map((l) => l.key)).toEqual(['canonical', 'hreflang-en', 'hreflang-x-default']);
  });

  it('writes og:/article: tags as property tags and skips undefined values', () => {
    const seo = setup('en');
    TestBed.inject(Meta).removeTag('property="og:image"'); // other specs may leave one behind
    seo.setPage({
      title: 'T',
      description: 'D',
      path: '/p',
      tags: { 'og:title': 'T', 'twitter:card': 'summary', 'og:image': undefined },
    });

    const meta = TestBed.inject(Meta);
    expect(meta.getTag('property="og:title"')?.content).toBe('T');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary');
    expect(meta.getTag('property="og:image"')).toBeNull();
  });

  it('emits JSON-LD with the schema context and page url filled in', () => {
    const seo = setup('fr');
    seo.setPage({ title: 'T', description: 'D', path: '/p', jsonLd: { '@type': 'Article', headline: 'T' } });

    const script = document.head.querySelector('script[data-seo="jsonld"]');
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(JSON.parse(script?.textContent ?? '{}')).toEqual({
      '@context': 'https://schema.org',
      url: 'https://www.alexabena.me/fr/p',
      '@type': 'Article',
      headline: 'T',
    });
  });

  it('replaces the previous page set instead of accumulating nodes, and clear removes all', () => {
    const seo = setup('en');
    seo.setPage({ title: 'A', description: 'D', path: '/a', jsonLd: { '@type': 'A' } });
    seo.setPage({ title: 'B', description: 'D', path: '/b' });

    expect(links().map((l) => l.href)).toContain('https://www.alexabena.me/b');
    expect(links().map((l) => l.href)).not.toContain('https://www.alexabena.me/a');
    expect(document.head.querySelector('script[data-seo="jsonld"]')).toBeNull();

    seo.clear();
    expect(document.head.querySelectorAll('[data-seo]').length).toBe(0);
  });
});
