import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { TocComponent, TocNode } from './toc.component';

describe('TocComponent', () => {
  let component: TocComponent;
  let fixture: ComponentFixture<TocComponent>;

  const nestedToc: TocNode[] = [
    {
      id: 'intro',
      text: 'Introduction',
      level: 2,
      children: [
        { id: 'background', text: 'Background', level: 3 },
        { id: 'goals', text: 'Goals', level: 3 },
      ],
    },
    {
      id: 'conclusion',
      text: 'Conclusion',
      level: 2,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TocComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when the toc tree is empty', () => {
    expect(component.hasNodes()).toBeFalse();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.toc')).toBeNull();
  });

  it('should render the collapsible container with a Contents summary', () => {
    fixture.componentRef.setInput('nodes', nestedToc);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const details = element.querySelector('details.toc');
    expect(details).toBeTruthy();

    const summary = details?.querySelector('summary');
    expect(summary?.textContent?.trim()).toBe('Contents');
  });

  it('should render one fragment link per heading, including nested ones', () => {
    fixture.componentRef.setInput('nodes', nestedToc);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const links = Array.from(element.querySelectorAll('.toc a'));

    // 2 top-level + 2 nested children = 4
    expect(links.length).toBe(4);

    const texts = links.map((a) => a.textContent?.trim());
    expect(texts).toEqual(['Introduction', 'Background', 'Goals', 'Conclusion']);

    // Each anchor is an in-page fragment link targeting its heading id.
    const hrefs = links.map((a) => a.getAttribute('href'));
    expect(hrefs[0]).toContain('#intro');
    expect(hrefs[1]).toContain('#background');
    expect(hrefs[2]).toContain('#goals');
    expect(hrefs[3]).toContain('#conclusion');
  });

  it('should nest child headings inside a nested list for indentation', () => {
    fixture.componentRef.setInput('nodes', nestedToc);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    // A nested <ul> exists (h3 children under the h2 <li>).
    expect(element.querySelector('.toc ul ul')).toBeTruthy();
  });

  it('should mark the active heading link with aria-current', () => {
    fixture.componentRef.setInput('nodes', nestedToc);
    component.activeId.set('goals');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const active = element.querySelector('.toc a[aria-current="true"]');
    expect(active?.textContent?.trim()).toBe('Goals');
    expect(active?.classList.contains('active')).toBeTrue();
  });
});
