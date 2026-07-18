import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProjectCardComponent } from './project-card.component';
import { Project } from '../../../core/interfaces/project.interface';

describe('ProjectCardComponent', () => {
  let component: ProjectCardComponent;
  let fixture: ComponentFixture<ProjectCardComponent>;
  let mockProject: Project;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCardComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectCardComponent);
    component = fixture.componentInstance;

    // Create a mock project
    mockProject = {
      id: 1,
      name: 'Test Project',
      description: 'A test project',
      technologies: ['Angular', 'TypeScript'],
      githubLink: 'https://github.com/test/project',
      challenges: 'Test challenges',
      whatILearned: 'Test learnings',
      isExpanded: false,
      totalRatings: 0,
      averageRating: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      featured: false,
      photoUrls: []
    };

    // project is a required input signal now.
    fixture.componentRef.setInput('project', mockProject);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

  it('should truncate description longer than maxDescriptionLength', () => {
    const longDescription = 'a'.repeat(200);
    fixture.componentRef.setInput('project', { ...mockProject, description: longDescription });
    fixture.componentRef.setInput('maxDescriptionLength', 150);
    fixture.detectChanges();
    const truncated = component.getTruncatedDescription();
    expect(truncated.endsWith('...')).toBe(true);
    expect(truncated.length).toBe(153);
  });

  it('should not truncate description shorter than maxDescriptionLength', () => {
    expect(component.getTruncatedDescription()).toBe('A test project');
  });
});
