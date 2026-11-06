import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectLinksComponent, presentLink } from './project-links.component';

describe('ProjectLinksComponent', () => {
  let fixture: ComponentFixture<ProjectLinksComponent>;

  function links(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('a'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProjectLinksComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProjectLinksComponent);
    fixture.componentRef.setInput('projectName', 'Hive');
  });

  it('renders both links in a new tab with distinct accessible names', () => {
    fixture.componentRef.setInput('githubLink', 'https://github.com/x/hive');
    fixture.componentRef.setInput('demoLink', ' https://hive.example ');
    fixture.detectChanges();

    const [demo, github] = links();
    expect(demo.getAttribute('href')).toBe('https://hive.example');
    expect(demo.getAttribute('aria-label')).toContain('Hive');
    expect(github.getAttribute('href')).toBe('https://github.com/x/hive');
    expect(github.getAttribute('rel')).toContain('noopener');
    expect(links().every((a) => a.target === '_blank')).toBe(true);
  });

  it('renders nothing for missing or blank links', () => {
    fixture.componentRef.setInput('githubLink', '   ');
    fixture.componentRef.setInput('demoLink', null);
    fixture.detectChanges();
    expect(links().length).toBe(0);
  });

  it('presentLink trims and treats blanks as absent', () => {
    expect(presentLink(' https://a.b ')).toBe('https://a.b');
    expect(presentLink('')).toBeNull();
    expect(presentLink(null)).toBeNull();
    expect(presentLink(undefined)).toBeNull();
  });
});
