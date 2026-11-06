import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectFormComponent } from './project-form.component';
import { Project, ProjectCreateRequest } from '../../../../core/interfaces/project.interface';

describe('ProjectFormComponent', () => {
  let fixture: ComponentFixture<ProjectFormComponent>;
  let component: ProjectFormComponent;
  let saved: ProjectCreateRequest[];

  const project: Project = {
    id: 5,
    name: 'Hive Check',
    description: 'A beekeeping companion app',
    technologies: ['Kotlin', 'Jetpack Compose'],
    githubLink: 'https://github.com/x/hive',
    demoLink: null,
    challenges: 'Offline sync',
    whatILearned: 'Compose state',
    averageRating: 0,
    totalRatings: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    featured: true,
    displayOrder: 0,
    photoUrls: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProjectFormComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProjectFormComponent);
    component = fixture.componentInstance;
    saved = [];
    component.save.subscribe((value) => saved.push(value));
    fixture.detectChanges();
  });

  it('does not emit while the form is invalid', () => {
    component.submitForm();
    expect(saved).toEqual([]);
  });

  it('emits the form value with technologies split from the comma list', () => {
    component.projectForm.setValue({
      name: 'New App',
      description: 'A long enough description',
      technologies: 'Angular, TypeScript,,  CSS3 ',
      githubLink: 'https://github.com/x/new',
      demoLink: '',
      challenges: 'c',
      whatILearned: 'w',
      descriptionFr: 'Une description',
      challengesFr: '',
      whatILearnedFr: '',
      featured: false,
    });
    component.submitForm();

    expect(saved).toEqual([
      {
        name: 'New App',
        description: 'A long enough description',
        technologies: ['Angular', 'TypeScript', 'CSS3'],
        githubLink: 'https://github.com/x/new',
        demoLink: null,
        challenges: 'c',
        whatILearned: 'w',
        descriptionFr: 'Une description',
        challengesFr: '',
        whatILearnedFr: '',
        featured: false,
      },
    ]);
  });

  it('loads a project into the form for editing and resets when it is cleared', () => {
    fixture.componentRef.setInput('project', project);
    fixture.detectChanges();

    expect(component.projectForm.getRawValue()).toEqual(
      expect.objectContaining({ name: 'Hive Check', technologies: 'Kotlin, Jetpack Compose', featured: true })
    );

    fixture.componentRef.setInput('project', null);
    fixture.detectChanges();

    expect(component.projectForm.getRawValue().name).toBe('');
    expect(component.projectForm.getRawValue().featured).toBe(false);
  });

  it('rejects a GitHub link that is not an http(s) URL', () => {
    component.projectForm.controls.githubLink.setValue('github.com/x/y');
    expect(component.projectForm.controls.githubLink.invalid).toBe(true);
  });

  it('accepts an empty live site URL and rejects one without a scheme', () => {
    const demoLink = component.projectForm.controls.demoLink;
    demoLink.setValue('');
    expect(demoLink.valid).toBe(true);
    demoLink.setValue('example.com');
    expect(demoLink.invalid).toBe(true);
    demoLink.setValue('https://example.com');
    expect(demoLink.valid).toBe(true);
  });
});
