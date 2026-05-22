import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PhotoService } from '../../../../core/services/photo.service';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Project } from '../../../../core/interfaces/project.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-photo-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-manager.component.html',
  styleUrls: ['./photo-manager.component.css'],
})
export class PhotoManagerComponent {
  private photoService = inject(PhotoService);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);

  project = input.required<Project>();
  close = output<void>();

  selectedFiles: File[] = [];
  isUploadingPhotos = signal(false);
  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  onFilesSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files) {
      this.selectedFiles = Array.from(inputEl.files);
    }
  }

  uploadPhotos() {
    const proj = this.project();
    if (!proj) {
      this.notificationService.error('No project selected');
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.notificationService.error('Please select at least one photo to upload');
      return;
    }

    this.isUploadingPhotos.set(true);

    const uploadObservables = this.selectedFiles.map(file =>
      this.photoService.uploadProjectPhoto(proj.id, file)
    );

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        this.notificationService.success(
          `Successfully uploaded ${results.length} photo(s)`
        );
        this.projectService.refreshProjects();
        this.selectedFiles = [];
        this.isUploadingPhotos.set(false);

        const fileInput = document.getElementById('photoInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (err) => {
        console.error('Error uploading photos:', err);
        this.notificationService.error('Failed to upload some photos');
        this.isUploadingPhotos.set(false);
      }
    });
  }

  deletePhoto(photoId: number) {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    this.photoService.deletePhoto(photoId).subscribe({
      next: () => {
        this.notificationService.success('Photo deleted successfully');
        this.projectService.refreshProjects();
      },
      error: (err) => {
        console.error('Error deleting photo:', err);
        this.notificationService.error('Failed to delete photo');
      }
    });
  }

  onClose() {
    this.close.emit();
  }
}
