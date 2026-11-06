import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectCardComponent } from './project-card.component';
import { Project } from '../../../core/interfaces/project.interface';

describe('ProjectCardComponent', () => {
  let component: ProjectCardComponent;
  let fixture: ComponentFixture<ProjectCardComponent>;
  let mockProject: Project;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectCardComponent);
    component = fixture.componentInstance;

    // Create a mock project
    mockProject = {
      id: 1,
      name: 'Test Project',
      description: 'A test project',
      technologies: ['Angular', 'TypeScript'],
      githubLink: 'https://github.com/test/project',
      demoLink: null,
      challenges: 'Test challenges',
      whatILearned: 'Test learnings',
      isExpanded: false,
      totalRatings: 0,
      averageRating: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      featured: false,
      displayOrder: 0,
      photoUrls: []
    };

    // project is a required input signal now.
    fixture.componentRef.setInput('project', mockProject);
    fixture.detectChanges();
  });

  it('should display project name', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Test Project');
  });

  it('should show featured badge when project is featured', () => {
    fixture.componentRef.setInput('project', { ...mockProject, featured: true });
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.featured-badge')).toBeTruthy();
  });

  it('should not show featured badge when project is not featured', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.featured-badge')).toBeFalsy();
  });

  it('links the card body to the project page with a real anchor', () => {
    const link = fixture.nativeElement.querySelector('.card-body a.card-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/projects/1');
    expect(link.textContent).toContain('Test Project');
  });

  it('shows no dates, no technologies label and no details button', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Created');
    expect(text).not.toContain('Technologies:');
    expect(text).not.toContain('Details');
  });

  it('shows only the links that exist, outside the card link', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card-footer a.github')).toBeTruthy();
    expect(el.querySelector('.card-footer a.demo')).toBeNull();
    expect(el.querySelector('.card-link a, .card-link .card-footer')).toBeNull();

    fixture.componentRef.setInput('project', { ...mockProject, githubLink: null, demoLink: 'https://demo.example' });
    fixture.detectChanges();
    expect(el.querySelector('.card-footer a.github')).toBeNull();
    expect(el.querySelector('.card-footer a.demo')?.getAttribute('href')).toBe('https://demo.example');
  });

  it('says the code is not public when the project has no links', () => {
    fixture.componentRef.setInput('project', { ...mockProject, githubLink: '  ', demoLink: null });
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('.card-footer') as HTMLElement;
    expect(footer.querySelector('a')).toBeNull();
    expect(footer.querySelector('.no-links')?.textContent).toContain('walk-through on request');
  });

  it('keeps the media box with a placeholder when there are no photos', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card-media .card-placeholder')?.textContent?.trim()).toBe('T');
    expect(el.querySelector('app-carousel')).toBeNull();
  });
});
