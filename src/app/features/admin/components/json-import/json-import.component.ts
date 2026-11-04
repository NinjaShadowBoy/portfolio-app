import { Component, inject, output, signal } from '@angular/core';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProjectImport } from '../../../../core/interfaces/project.interface';

const SAMPLES = {
  single: {
    name: 'Sample Project',
    description: 'A sample project description',
    technologies: ['TypeScript', 'Angular'],
    githubLink: 'https://github.com/username/repo',
    challenges: 'Sample challenges',
    whatILearned: 'Sample learnings',
    featured: false,
  },
  array: [
    {
      name: 'Project 1',
      description: 'First project description',
      technologies: ['JavaScript'],
      githubLink: 'https://github.com/username/repo1',
      challenges: 'Challenges 1',
      whatILearned: 'Learnings 1',
      featured: false,
    },
    {
      name: 'Project 2',
      description: 'Second project description',
      technologies: ['TypeScript', 'React'],
      githubLink: 'https://github.com/username/repo2',
      challenges: 'Challenges 2',
      whatILearned: 'Learnings 2',
      featured: true,
    },
  ],
} satisfies Record<string, ProjectImport | ProjectImport[]>;

const REQUIRED_TEXT_FIELDS = ['name', 'description', 'githubLink', 'challenges', 'whatILearned'];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Parses pasted JSON into one project or a batch, validating every record first. */
@Component({
  selector: 'app-json-import',
  standalone: true,
  templateUrl: './json-import.component.html',
  styleUrls: ['./json-import.component.css'],
})
export class JsonImportComponent {
  private notificationService = inject(NotificationService);

  importData = signal('');
  jsonError = signal('');

  importSuccess = output<ProjectImport | ProjectImport[]>();

  processJson() {
    const input = this.importData();
    if (!input.trim()) {
      this.jsonError.set($localize`:@@jsonEnterData:Please enter JSON data`);
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch {
      this.jsonError.set($localize`:@@jsonInvalidFormat:Invalid JSON format. Please check your input.`);
      this.notificationService.error($localize`:@@jsonInvalidFormatShort:Invalid JSON format`);
      return;
    }

    if (Array.isArray(data)) {
      if (!data.length || !data.every((p) => this.validateProjectData(p))) {
        this.jsonError.set(
          $localize`:@@jsonMissingFieldsArray:One or more projects in the array are missing required fields: name, description, technologies, githubLink, challenges, whatILearned`
        );
        return;
      }
    } else if (!this.validateProjectData(data)) {
      this.jsonError.set(
        $localize`:@@jsonMissingFields:Missing required fields: name, description, technologies, githubLink, challenges, whatILearned`
      );
      return;
    }

    this.jsonError.set('');
    this.importSuccess.emit(data);
    this.importData.set('');
  }

  validateProjectData(data: unknown): data is ProjectImport {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    const project = data as Record<string, unknown>;
    const { technologies, featured, id } = project;
    return (
      REQUIRED_TEXT_FIELDS.every((field) => isNonEmptyString(project[field])) &&
      Array.isArray(technologies) &&
      technologies.every(isNonEmptyString) &&
      (featured === undefined || typeof featured === 'boolean') &&
      (id === undefined || (typeof id === 'number' && Number.isSafeInteger(id) && id > 0))
    );
  }

  copySample(kind: keyof typeof SAMPLES) {
    navigator.clipboard.writeText(JSON.stringify(SAMPLES[kind], null, 2));
    this.notificationService.info(
      kind === 'array'
        ? $localize`:@@jsonArrayCopied:Sample JSON array copied to clipboard`
        : $localize`:@@jsonCopied:Sample JSON copied to clipboard`
    );
  }

  clear() {
    this.importData.set('');
    this.jsonError.set('');
  }
}
