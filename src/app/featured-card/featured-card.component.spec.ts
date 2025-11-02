import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeaturedCardComponent } from './featured-card.component';
import { Project } from '../interfaces/project.interface';
import { RouterTestingModule } from '@angular/router/testing';

describe('FeaturedCardComponent', () => {
  let component: FeaturedCardComponent;
  let fixture: ComponentFixture<FeaturedCardComponent>;
  let mockProject: Project;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedCardComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturedCardComponent);
    component = fixture.componentInstance;

    // Create a mock project
    mockProject = {
      id: 1,
      name: 'Featured Project',
      description: 'A featured project description',
      technologies: ['Angular', 'TypeScript', 'CSS'],
      githubLink: 'https://github.com/test/project',
      challenges: 'Test challenges',
      whatILearned: 'Test learnings',
      isExpanded: false,
      totalRatings: 0,
      averageRating: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      featured: true,
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
    expect(compiled.querySelector('h3')?.textContent).toContain('Featured Project');
  });

  it('should display project description', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('A featured project description');
  });

  it('should display technologies', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Angular, TypeScript, CSS');
  });

  it('should have featured badge', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.featured-badge')).toBeTruthy();
  });

  it('should have CTA button with explore icon', () => {
    const compiled = fixture.nativeElement;
    const ctaButton = compiled.querySelector('app-cta-button');
    expect(ctaButton).toBeTruthy();
  });
});
