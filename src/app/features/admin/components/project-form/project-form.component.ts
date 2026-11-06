import { Component, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Project, ProjectCreateRequest } from '../../../../core/interfaces/project.interface';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.css',
})
export class ProjectFormComponent {
  private fb = inject(NonNullableFormBuilder);

  formMode = input<'create' | 'edit'>('create');
  /** The project to edit; null resets the form for creation. */
  project = input<Project | null>(null);

  save = output<ProjectCreateRequest>();
  cancel = output<void>();

  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    technologies: ['', Validators.required], // comma-separated in the UI
    githubLink: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    demoLink: ['', Validators.pattern(/^https?:\/\/.+/)], // optional
    challenges: ['', Validators.required],
    whatILearned: ['', Validators.required],
    featured: [false],
  });

  constructor() {
    effect(() => {
      const project = this.project();
      if (!project) {
        this.projectForm.reset();
        return;
      }
      this.projectForm.setValue({
        name: project.name,
        description: project.description,
        technologies: project.technologies.join(', '),
        githubLink: project.githubLink ?? '',
        demoLink: project.demoLink ?? '',
        challenges: project.challenges ?? '',
        whatILearned: project.whatILearned ?? '',
        featured: project.featured ?? false,
      });
    });
  }

  submitForm() {
    if (this.projectForm.invalid) return;

    const { technologies, demoLink, ...rest } = this.projectForm.getRawValue();
    this.save.emit({
      ...rest,
      demoLink: demoLink.trim() || null,
      technologies: technologies
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
