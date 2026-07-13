
import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-json-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './json-import.component.html',
  styleUrls: ['./json-import.component.css'],
})
export class JsonImportComponent {
  private notificationService = inject(NotificationService);

  importData = signal('');
  jsonError = signal('');

  importSuccess = output<any>();

  processJson() {
    const input = this.importData();
    if (!input.trim()) {
      this.jsonError.set($localize`@@jsonEnterData:Please enter JSON data`);
      return;
    }

    try {
      const data = JSON.parse(input);
      this.jsonError.set('');

      if (Array.isArray(data)) {
        const valid = data.every((p) => this.validateProjectData(p));
        if (!valid) {
          this.jsonError.set(
            $localize`@@jsonMissingFieldsArray:One or more projects in the array are missing required fields: name, description, technologies, githubLink, challenges, whatILearned`
          );
          return;
        }
      } else {
        if (!this.validateProjectData(data)) {
          this.jsonError.set(
            $localize`@@jsonMissingFields:Missing required fields: name, description, technologies, githubLink, challenges, whatILearned`
          );
          return;
        }
      }

      this.importSuccess.emit(data);
      this.importData.set('');
    } catch (err) {
      this.jsonError.set($localize`@@jsonInvalidFormat:Invalid JSON format. Please check your input.`);
      this.notificationService.error($localize`@@jsonInvalidFormatShort:Invalid JSON format`);
    }
  }

  validateProjectData(data: any): boolean {
    return !!(
      data &&
      data.name &&
      data.description &&
      data.technologies &&
      data.githubLink &&
      data.challenges &&
      data.whatILearned
    );
  }

  getSampleJson(): string {
    return JSON.stringify(
      {
        name: 'Sample Project',
        description: 'A sample project description',
        technologies: ['TypeScript', 'Angular'],
        githubLink: 'https://github.com/username/repo',
        challenges: 'Sample challenges',
        whatILearned: 'Sample learnings',
        featured: false,
      },
      null,
      2
    );
  }

  getSampleJsonArray(): string {
    return JSON.stringify(
      [
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
      null,
      2
    );
  }

  copySampleJson() {
    navigator.clipboard.writeText(this.getSampleJson());
    this.notificationService.info($localize`@@jsonCopied:Sample JSON copied to clipboard`);
  }

  copySampleJsonArray() {
    navigator.clipboard.writeText(this.getSampleJsonArray());
    this.notificationService.info($localize`@@jsonArrayCopied:Sample JSON array copied to clipboard`);
  }

  clear() {
    this.importData.set('');
    this.jsonError.set('');
  }
}
