import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { PhotoService } from '../../../../core/services/photo.service';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Project } from '../../../../core/interfaces/project.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-photo-manager',
  standalone: true,
  templateUrl: './photo-manager.component.html',
  styleUrls: ['./photo-manager.component.css'],
})
export class PhotoManagerComponent {
  private photoService = inject(PhotoService);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);

  project = input.required<Project>();
  close = output<void>();

  private fileInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

  selectedFiles = signal<File[]>([]);
  isUploadingPhotos = signal(false);
  /** Photo records store API-relative paths; the origin is prepended for display. */
  apiBaseUrl = environment.apiBaseUrl.replace('/api/v1', '');

  onFilesSelected(event: Event) {
    this.selectedFiles.set(Array.from((event.target as HTMLInputElement).files ?? []));
  }

  uploadPhotos() {
    const files = this.selectedFiles();
    if (files.length === 0) {
      this.notificationService.error($localize`:@@photoSelectRequired:Please select at least one photo to upload`);
      return;
    }

    this.isUploadingPhotos.set(true);
    forkJoin(files.map((file) => this.photoService.uploadProjectPhoto(this.project().id, file)))
      .pipe(finalize(() => this.isUploadingPhotos.set(false)))
      .subscribe({
        next: (results) => {
          this.notificationService.success(
            $localize`:@@photoUploadSuccess:Successfully uploaded ${results.length} photo(s)`
          );
          this.projectService.refreshProjects();
          this.selectedFiles.set([]);
          const inputEl = this.fileInput()?.nativeElement;
          if (inputEl) inputEl.value = '';
        },
        error: (err) => {
          console.error('Error uploading photos:', err);
          this.notificationService.error($localize`:@@photoUploadFailed:Failed to upload some photos`);
        },
      });
  }

  deletePhoto(photoId: number) {
    if (!confirm($localize`:@@photoDeleteConfirm:Are you sure you want to delete this photo?`)) return;

    this.photoService.deletePhoto(photoId).subscribe({
      next: () => {
        this.notificationService.success($localize`:@@photoDeleted:Photo deleted successfully`);
        this.projectService.refreshProjects();
      },
      error: (err) => {
        console.error('Error deleting photo:', err);
        this.notificationService.error($localize`:@@photoDeleteFailed:Failed to delete photo`);
      },
    });
  }

  onClose() {
    this.close.emit();
  }
}
