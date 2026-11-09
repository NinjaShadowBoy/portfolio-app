import { Component, ElementRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Project, ProjectCreateRequest } from '../../../../core/interfaces/project.interface';

export type ProjectSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['../../admin-shared.css', './project-form.component.css'],
})
export class ProjectFormComponent {
  private fb = inject(NonNullableFormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  formMode = input<'create' | 'edit'>('create');
  /**
   * The project to edit; null resets the form for creation. A new value for
   * the same project (after a save or reload) refills the form only while it
   * has no unsaved edits, so a reload never overwrites typing.
   */
  project = input<Project | null>(null);
  /** The parent's save state. `saved` marks the form pristine if it still holds the submitted values. */
  saveStatus = input<ProjectSaveStatus>('idle');

  save = output<ProjectCreateRequest>();

  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    technologies: ['', Validators.required], // comma-separated in the UI
    githubLink: ['', Validators.pattern(/^https?:\/\/.+/)], // optional: GitHub or GitLab
    demoLink: ['', Validators.pattern(/^https?:\/\/.+/)], // optional
    challenges: ['', Validators.required],
    whatILearned: ['', Validators.required],
    // French versions, optional; empty means the French site shows the English text.
    descriptionFr: [''],
    challengesFr: [''],
    whatILearnedFr: [''],
    featured: [false],
  });

  /** Mirrors `projectForm.dirty` as a signal, for the template and the parent's unsaved-changes guard. */
  readonly dirty = signal(false);
  /** Saving is allowed only when there are edits and they are valid; the editor's Save button reads it. */
  readonly saveEnabled = signal(false);
  /** How many of the three French fields hold text; the collapsible section's summary shows it. */
  readonly frenchCount = signal(0);

  private loadedId: number | null = null;
  private submitted: string | null = null;

  constructor() {
    this.projectForm.events
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.dirty.set(this.projectForm.dirty);
        this.saveEnabled.set(this.projectForm.valid && this.projectForm.dirty);
        const value = this.projectForm.getRawValue();
        this.frenchCount.set(
          [value.descriptionFr, value.challengesFr, value.whatILearnedFr].filter((text) => text.trim()).length
        );
      });

    effect(() => {
      const project = this.project();
      untracked(() => {
        const id = project?.id ?? null;
        if (id !== this.loadedId || !this.projectForm.dirty) this.load(project);
        this.loadedId = id;
      });
    });

    effect(() => {
      if (this.saveStatus() !== 'saved') return;
      untracked(() => {
        // Edits made while the request was in flight stay unsaved.
        if (this.submitted === JSON.stringify(this.projectForm.getRawValue())) this.markPristine();
      });
    });
  }

  /** "2 of 3 translated" for the collapsed French section's summary. */
  frenchCountLabel(): string {
    return $localize`:@@projectFormFrenchTranslatedCount:${this.frenchCount()}:count: of 3 translated`;
  }

  submitForm() {
    if (this.projectForm.invalid) return;

    const raw = this.projectForm.getRawValue();
    this.submitted = JSON.stringify(raw);
    const { technologies, demoLink, githubLink, ...rest } = raw;
    this.save.emit({
      ...rest,
      githubLink: githubLink.trim() || null,
      demoLink: demoLink.trim() || null,
      technologies: technologies
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  /** Puts the cursor in the first field, e.g. when the editor dialog opens. */
  focusFirstField() {
    this.host.nativeElement.querySelector<HTMLInputElement>('#name')?.focus();
  }

  private load(project: Project | null) {
    if (!project) {
      this.projectForm.reset();
    } else {
      this.projectForm.setValue({
        name: project.name,
        description: project.description,
        technologies: project.technologies.join(', '),
        githubLink: project.githubLink ?? '',
        demoLink: project.demoLink ?? '',
        challenges: project.challenges ?? '',
        whatILearned: project.whatILearned ?? '',
        descriptionFr: project.descriptionFr ?? '',
        challengesFr: project.challengesFr ?? '',
        whatILearnedFr: project.whatILearnedFr ?? '',
        featured: project.featured ?? false,
      });
    }
    this.markPristine();
  }

  private markPristine() {
    this.projectForm.markAsPristine();
    this.projectForm.markAsUntouched();
    this.dirty.set(false);
  }
}
