import { Component, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Project } from '../../../../core/interfaces/project.interface';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.css'],
})
export class ProjectFormComponent {
  formMode = input<'create' | 'edit'>('create');
  project = input<Project | null>(null);

  save = output<any>();
  cancel = output<void>();

  projectForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
    technologies: new FormControl('', Validators.required),
    githubLink: new FormControl('', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/),
    ]),
    challenges: new FormControl('', Validators.required),
    whatILearned: new FormControl('', Validators.required),
    featured: new FormControl(false),
  });

  constructor() {
    effect(() => {
      const proj = this.project();
      if (proj) {
        this.projectForm.patchValue({
          name: proj.name,
          description: proj.description,
          technologies: proj.technologies.join(', '),
          githubLink: proj.githubLink || '',
          challenges: proj.challenges || '',
          whatILearned: proj.whatILearned || '',
          featured: proj.featured || false,
        });
      } else {
        this.projectForm.reset({ featured: false });
      }
    });
  }

  submitForm() {
    if (this.projectForm.invalid) {
      return;
    }

    const formValue = this.projectForm.value;
    const technologies = formValue.technologies
      ? formValue.technologies.split(',').map((t) => t.trim())
      : [];

    this.save.emit({
      name: formValue.name || '',
      description: formValue.description || '',
      technologies,
      githubLink: formValue.githubLink || '',
      challenges: formValue.challenges || '',
      whatILearned: formValue.whatILearned || '',
      featured: formValue.featured || false,
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
