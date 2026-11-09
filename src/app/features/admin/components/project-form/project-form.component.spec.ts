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

  it('refills from a new copy of the same project only while there are no unsaved edits', () => {
    fixture.componentRef.setInput('project', project);
    fixture.detectChanges();
    component.projectForm.controls.name.setValue('Typing...');
    component.projectForm.markAsDirty();

    // A reload hands over a fresh object for the same project.
    fixture.componentRef.setInput('project', { ...project, description: 'Changed on the server' });
    fixture.detectChanges();
    expect(component.projectForm.getRawValue().name).toBe('Typing...');
    expect(component.dirty()).toBe(true);

    // Switching to another project always loads it.
    fixture.componentRef.setInput('project', { ...project, id: 6, name: 'Other' });
    fixture.detectChanges();
    expect(component.projectForm.getRawValue().name).toBe('Other');
    expect(component.dirty()).toBe(false);
  });

  it('marks the form pristine when the parent reports the save, unless it was edited meanwhile', async () => {
    fixture.componentRef.setInput('project', project);
    fixture.detectChanges();
    const name = component.projectForm.controls.name;

    name.setValue('Saved name');
    component.projectForm.markAsDirty();
    component.submitForm();
    fixture.componentRef.setInput('saveStatus', 'saving');
    fixture.detectChanges();
    fixture.componentRef.setInput('saveStatus', 'saved');
    fixture.detectChanges();
    expect(component.dirty()).toBe(false);

    name.setValue('Saved name again');
    component.projectForm.markAsDirty();
    component.submitForm();
    fixture.componentRef.setInput('saveStatus', 'saving');
    fixture.detectChanges();
    name.setValue('Typed while saving');
    fixture.componentRef.setInput('saveStatus', 'saved');
    fixture.detectChanges();
    expect(component.dirty()).toBe(true);
  });

  it('allows saving only through valid, edited controls', () => {
    expect(component.saveEnabled()).toBe(false);

    // Valid but untouched: still no save, the editor keeps Save disabled.
    component.projectForm.setValue({
      name: 'New App',
      description: 'A long enough description',
      technologies: 'Angular',
      githubLink: '',
      demoLink: '',
      challenges: 'c',
      whatILearned: 'w',
      descriptionFr: '',
      challengesFr: '',
      whatILearnedFr: '',
      featured: false,
    });
    expect(component.saveEnabled()).toBe(false);

    component.projectForm.markAsDirty();
    expect(component.saveEnabled()).toBe(true);
  });

  it('rejects a GitHub link that is not an http(s) URL', () => {
    component.projectForm.controls.githubLink.setValue('github.com/x/y');
    expect(component.projectForm.controls.githubLink.invalid).toBe(true);
  });

  it('accepts an empty live site URL and rejects one without a scheme', async () => {
    const demoLink = component.projectForm.controls.demoLink;
    demoLink.setValue('');
    expect(demoLink.valid).toBe(true);
    demoLink.setValue('example.com');
    expect(demoLink.invalid).toBe(true);
    demoLink.setValue('https://example.com');
    expect(demoLink.valid).toBe(true);
  });

  it('collapses the French fields and counts the filled ones in the summary', async () => {
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details.french-fields');
    expect(details?.hasAttribute('open')).toBe(false);

    component.projectForm.setValue({
      name: 'New App',
      description: 'A long enough description',
      technologies: 'Angular',
      githubLink: '',
      demoLink: '',
      challenges: 'c',
      whatILearned: 'w',
      descriptionFr: 'Une description',
      challengesFr: '   ',
      whatILearnedFr: 'Ce que ',
      featured: false,
    });
    fixture.detectChanges();

    expect(component.frenchCount()).toBe(2);
    expect(details.querySelector('.french-count')?.textContent?.trim()).toBe('2 of 3 translated');
  });
});
