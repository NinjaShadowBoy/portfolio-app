import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconCloudComponent } from './icon-cloud.component';
import { CloudEntry, LEVEL_SIZE, layoutCloud } from './icon-cloud.layout';

const ENTRIES: CloudEntry[] = [
  { name: 'TypeScript', level: 3 },
  { name: 'Go', level: 3 },
  { name: 'Kotlin', level: 2 },
  { name: 'Java', level: 2 },
  { name: 'Python', level: 2 },
  { name: 'C', level: 1 },
  { name: 'C++', level: 1 },
  { name: 'Next.js', level: 1 },
];

describe('layoutCloud', () => {
  it('returns the same layout for the same input', () => {
    expect(layoutCloud(ENTRIES)).toEqual(layoutCloud(ENTRIES.map((e) => ({ ...e }))));
  });

  it('keeps entries in input order with sizes that follow the usage level', () => {
    const { width, entries } = layoutCloud(ENTRIES);

    expect(entries.map((e) => e.name)).toEqual(ENTRIES.map((e) => e.name));
    for (const e of entries) {
      expect(e.size).toBeCloseTo((LEVEL_SIZE[e.level] / width) * 100, 1);
    }
  });

  it('places every logo inside the box without overlapping another', () => {
    const { width, height, entries } = layoutCloud(ENTRIES);
    const circles = entries.map((e) => {
      const d = (e.size / 100) * width;
      return { x: (e.left / 100) * width + d / 2, y: (e.top / 100) * height + d / 2, r: d / 2 };
    });

    for (const c of circles) {
      expect(c.x - c.r).toBeGreaterThanOrEqual(0);
      expect(c.y - c.r).toBeGreaterThanOrEqual(0);
      expect(c.x + c.r).toBeLessThanOrEqual(width + 0.5);
      expect(c.y + c.r).toBeLessThanOrEqual(height + 0.5);
    }
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const [a, b] = [circles[i], circles[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
      }
    }
  });

  it('returns an empty layout for no entries', () => {
    expect(layoutCloud([])).toEqual({ width: 0, height: 0, entries: [] });
  });
});

describe('IconCloudComponent', () => {
  let fixture: ComponentFixture<IconCloudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IconCloudComponent] }).compileComponents();
    fixture = TestBed.createComponent(IconCloudComponent);
    fixture.componentRef.setInput('entries', ENTRIES);
    fixture.componentRef.setInput('label', 'Languages');
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;

  it('reserves the cloud size before any logo loads', () => {
    const { width, height } = layoutCloud(ENTRIES);
    const list = el().querySelector<HTMLUListElement>('ul.cloud')!;

    expect(list.getAttribute('aria-label')).toBe('Languages');
    expect(list.style.width).toBe(`${width}px`);
    expect(list.style.aspectRatio.replace(/\s/g, '')).toBe(`${width}/${height}`);
  });

  it('links each technology to its docs with its name and usage level as accessible name', () => {
    const link = el().querySelector<HTMLAnchorElement>('a.cloud-item')!;

    expect(el().querySelectorAll('li.cloud-entry').length).toBe(ENTRIES.length);
    expect(link.getAttribute('href')).toBe('https://www.typescriptlang.org/');
    expect(link.getAttribute('aria-label')).toBe('TypeScript, used daily');
    expect(link.querySelector('img')!.getAttribute('alt')).toBe('');
  });

  it('marks black logos for the dark-mode treatment only', () => {
    const imgs = Array.from(el().querySelectorAll<HTMLImageElement>('img.logo'));
    const dark = imgs.filter((i) => i.classList.contains('dark-logo')).map((i) => i.getAttribute('src'));

    expect(dark).toHaveLength(1);
    expect(dark[0]).toContain('nextjs');
  });

  it('falls back to the initial when a logo fails to load', () => {
    const first = el().querySelector<HTMLImageElement>('li.cloud-entry img')!;
    first.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const fallback = el().querySelector('li.cloud-entry .fallback');
    expect(fallback?.textContent?.trim()).toBe('T');
  });
});
