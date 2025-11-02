import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectCardComponent } from './project-card.component';
import { Project } from '../interfaces/project.interface';

describe('ProjectCardComponent', () => {
  let component: ProjectCardComponent;
  let fixture: ComponentFixture<ProjectCardComponent>;
  let mockProject: Project;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCardComponent]
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

    component.project = mockProject;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display project name', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Test Project');
  });

  it('should emit toggleDetails event when toggle button clicked', () => {
    spyOn(component.toggleDetails, 'emit');
    component.onToggleDetails();
    expect(component.toggleDetails.emit).toHaveBeenCalledWith(mockProject);
  });

  it('should emit addRating event when rating button clicked', () => {
    spyOn(component.addRating, 'emit');
    const rating = 5;
    component.onAddRating(rating);
    expect(component.addRating.emit).toHaveBeenCalledWith({
      project: mockProject,
      rating
    });
  });

  it('should show featured badge when project is featured', () => {
    component.project.featured = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.featured-badge')).toBeTruthy();
  });

  it('should calculate star array correctly', () => {
    const starArray = component.getStarArray(3);
    expect(starArray).toEqual([1, 2, 3, 4, 5]);
  });

  it('should return correct rating class', () => {
    expect(component.getRatingClass(1, 3.5)).toBe('star-filled');
    expect(component.getRatingClass(4, 3.5)).toBe('star-half');
    expect(component.getRatingClass(5, 3.5)).toBe('star-empty');
  });
});
