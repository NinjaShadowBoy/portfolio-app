import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechTagsComponent } from './tech-tags.component';

describe('TechTagsComponent', () => {
  let fixture: ComponentFixture<TechTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TechTagsComponent] }).compileComponents();
    fixture = TestBed.createComponent(TechTagsComponent);
  });

  function render(technologies: string[], variant?: 'chip' | 'pill'): HTMLElement {
    fixture.componentRef.setInput('technologies', technologies);
    if (variant) fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('links known technologies to their documentation with a logo, keeping the given label', () => {
    const el = render(['angular']);
    const link = el.querySelector<HTMLAnchorElement>('a.tech-tag')!;

    expect(link.getAttribute('href')).toBe('https://angular.dev/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.querySelector('img.tech-icon')).toBeTruthy();
    expect(link.textContent?.trim()).toBe('angular');
  });

  it('renders unknown technologies as plain chips without a logo', () => {
    const el = render(['MadeUpLang']);

    expect(el.querySelector('a')).toBeNull();
    expect(el.querySelector('span.tech-tag')?.textContent?.trim()).toBe('MadeUpLang');
    expect(el.querySelector('img')).toBeNull();
  });

  it('applies the pill host class only for the pill variant', () => {
    render(['Go']);
    expect(fixture.nativeElement.classList.contains('pill')).toBe(false);

    render(['Go'], 'pill');
    expect(fixture.nativeElement.classList.contains('pill')).toBe(true);
  });
});
