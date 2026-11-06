import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { HomeComponent } from './home.component';
import { ProjectDataService } from '../../core/services/project-data.service';

/** Records the observers the component creates so a test can fire intersection changes by hand. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }

  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const arsenal = () => el().querySelector('.my-tools-section') as HTMLElement;

  beforeEach(async () => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: ProjectDataService, useValue: { featuredProjects: signal([]) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('leads the hero with a heading, a short intro and links to projects and contact', () => {
    expect(el().querySelector('.hero-greeting')?.textContent).toContain('Alex');
    const intro = el().querySelector('.headline')?.textContent?.trim() ?? '';
    expect(intro.split(/\s+/).length).toBeLessThanOrEqual(20);
    const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('.hero-actions a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(['/projects', '/contact']);
  });

  it('keeps the hero photo sized before it loads, so it cannot shift the layout', () => {
    const photo = el().querySelector('.my-face') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('assets/images/2223i141.jpg');
    expect(photo.getAttribute('width')).toBe('512');
    expect(photo.getAttribute('height')).toBe('512');
    expect(photo.getAttribute('fetchpriority')).toBe('high');
  });

  it('pauses the rings while the arsenal section is off-screen', async () => {
    const [observer] = FakeIntersectionObserver.instances;
    expect(observer.observed).toEqual([arsenal()]);
    expect(arsenal().classList).not.toContain('rings-paused');

    observer.fire(false);
    await fixture.whenStable();
    expect(arsenal().classList).toContain('rings-paused');

    observer.fire(true);
    await fixture.whenStable();
    expect(arsenal().classList).not.toContain('rings-paused');
  });

  it('disconnects the observer when the page is destroyed', () => {
    const [observer] = FakeIntersectionObserver.instances;
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });
});
