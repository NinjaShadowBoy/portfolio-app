import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { Subscription, tap } from 'rxjs';
import { PhotoService } from '../../../../core/services/photo.service';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { injectDeferDelete } from '../../../../core/utils/deferred-action';
import { Photo, Project } from '../../../../core/interfaces/project.interface';
import { REORDER_GRID, ReorderEvent } from '../../../../shared/ui/reorder-grid/reorder-grid.directives';
import { mergeVisibleOrder, reconcileOrder, sameOrder, withPhotoOrder } from './photo-order';
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  PhotoUploadQueue,
  RejectedFile,
  UploadItem,
  UploadSummary,
} from './photo-upload-queue';

/** Moves made within this window after the last one go out as one request. */
export const PHOTO_ORDER_SAVE_DELAY_MS = 600;

export type PhotoOrderStatus = 'idle' | 'saving' | 'saved';

/**
 * Uploads, deletes and orders the photos of one project. `project` must be a
 * live value (looked up from `ProjectDataService.projects()`), not a
 * snapshot: new, deleted and moved photos reach the grid through `patchProject`.
 *
 * Ordering is optimistic: a move shows at once and is saved
 * `PHOTO_ORDER_SAVE_DELAY_MS` after the last move, with the complete id list
 * the server requires. Photos waiting out their Undo delete window are still
 * on the server, so they stay in that list, in the slot they had. A failed
 * save puts back the last order the server confirmed.
 *
 * It renders as a plain section of the project editor dialog (never its own
 * modal), and its paste and drop handling is scoped to it: pastes and file
 * drops anywhere inside it upload files.
 */
@Component({
  selector: 'app-photo-manager',
  imports: [...REORDER_GRID],
  templateUrl: './photo-manager.component.html',
  styleUrls: ['../../admin-shared.css', './photo-manager.component.css'],
  host: {
    '(paste)': 'onPaste($event)',
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class PhotoManagerComponent {
  private photoService = inject(PhotoService);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private readonly deferDelete = injectDeferDelete();

  project = input.required<Project>();

  readonly accept = ACCEPTED_PHOTO_TYPES.join(',');
  readonly maxMb = MAX_PHOTO_BYTES / (1024 * 1024);

  readonly queue = new PhotoUploadQueue({
    upload: (file) => this.photoService.uploadProjectPhoto(this.project().id, file),
    onSaved: (photo) => this.addPhoto(photo),
    onIdle: (summary) => this.reportUploads(summary),
  });

  /** Photos waiting out their Undo window. */
  private readonly hiddenPhotoIds = signal<ReadonlySet<number>>(new Set());
  readonly photos = computed(() => {
    const hidden = this.hiddenPhotoIds();
    return (this.project().photos ?? []).filter((photo) => !hidden.has(photo.id));
  });
  /** Payloads without photo records carry URLs only; those cannot be deleted here. */
  readonly legacyUrls = computed(() =>
    (this.project().photos?.length ?? 0) === 0 && this.hiddenPhotoIds().size === 0 ? this.project().photoUrls : []
  );
  readonly photoCount = computed(() => this.photos().length || this.legacyUrls().length);

  /** Nested dragenter/dragleave pairs, so moving over a child does not drop the highlight. */
  private dragDepth = 0;
  readonly dragging = signal(false);

  readonly orderStatus = signal<PhotoOrderStatus>('idle');
  private orderTimer: ReturnType<typeof setTimeout> | null = null;
  /** Order requests not answered yet; one runs at a time, the rest wait in `PhotoService`. */
  private readonly orderRequests = new Set<Subscription>();
  /** Order the server holds, captured before the first unsaved move. Null when nothing is unsaved. */
  private confirmedOrder: readonly number[] | null = null;
  /** Order the admin asked for. Null when nothing is unsaved. */
  private desiredOrder: readonly number[] | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.queue.dispose();
      // Closing within the debounce window still saves the order.
      if (this.orderTimer !== null) {
        clearTimeout(this.orderTimer);
        this.sendOrder();
      }
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    // Clear it so choosing the same file again still fires `change`.
    input.value = '';
  }

  onDragEnter(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  onDragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    // Without this the browser opens the dropped file instead.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  onDragLeave(event: DragEvent) {
    if (!hasFiles(event)) return;
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragging.set(false);
  }

  onDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  /** Pasted images (a screenshot, or files copied in a file manager). Text pastes pass through. */
  onPaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0) return;
    event.preventDefault();
    this.addFiles(files);
  }

  addFiles(files: File[]) {
    const rejected = this.queue.add(files);
    if (rejected.length > 0) this.reportRejected(rejected);
  }

  statusLabel(item: UploadItem): string {
    switch (item.status) {
      case 'queued':
        return $localize`:@@photoUploadQueued:Waiting`;
      case 'uploading':
        return $localize`:@@photoUploadUploading:Uploading ${item.progress}:percent:%`;
      case 'saving':
        return $localize`:@@photoUploadSaving:Saving`;
      case 'done':
        return $localize`:@@photoUploadDone:Uploaded`;
      case 'failed':
        return $localize`:@@photoUploadItemFailed:Failed: ${item.error}:reason:`;
    }
  }

  photoLabel(photo: Photo): string {
    return $localize`:@@photoManagerPhotoLabel:Photo ${photo.id}:id:`;
  }

  /** Applies a move from the reorder grid (drag, keyboard or the tile buttons) and schedules the save. */
  onReorder(event: ReorderEvent<Photo>) {
    const project = this.project();
    const all = (project.photos ?? []).map((photo) => photo.id);
    const next = mergeVisibleOrder(
      all,
      event.items.map((photo) => photo.id),
      this.hiddenPhotoIds()
    );
    this.confirmedOrder ??= all;
    this.desiredOrder = next;
    this.projectService.patchProject(project.id, (current) => withPhotoOrder(current, next));
    this.orderStatus.set('saving');
    if (this.orderTimer !== null) clearTimeout(this.orderTimer);
    this.orderTimer = setTimeout(() => this.sendOrder(), PHOTO_ORDER_SAVE_DELAY_MS);
  }

  deletePhoto(photo: Photo) {
    const projectId = this.project().id;
    this.deferDelete({
      hide: () => this.hiddenPhotoIds.update((ids) => new Set(ids).add(photo.id)),
      restore: () => this.unhide(photo.id),
      commit: () =>
        this.photoService.deletePhoto(photo.id).pipe(
          tap(() => {
            this.projectService.patchProject(projectId, (project) => ({
              ...project,
              photos: (project.photos ?? []).filter((item) => item.id !== photo.id),
              photoUrls: project.photoUrls.filter((url) => url !== photo.photoUrl),
            }));
            this.unhide(photo.id);
          })
        ),
      message: $localize`:@@photoDeletePending:Photo deleted.`,
      errorMessage: $localize`:@@photoDeleteFailed:Could not delete the photo. It has been put back.`,
    });
  }

  /**
   * Whether closing may proceed: with uploads running it asks first, and a
   * "Stop and close" answer lets the editor stop them by being destroyed.
   */
  async canClose(): Promise<boolean> {
    const running = this.queue.activeCount();
    if (running === 0) return true;
    return this.confirm.ask({
      title: $localize`:@@photoManagerStopTitle:Stop the uploads?`,
      body: $localize`:@@photoManagerStopBody:${running}:count: photo(s) are still uploading. Closing stops them.`,
      confirmLabel: $localize`:@@photoManagerStopConfirm:Stop and close`,
      cancelLabel: $localize`:@@photoManagerKeepUploading:Keep uploading`,
      tone: 'danger',
    });
  }

  /** Appended last, where the server puts a new photo. */
  private addPhoto(photo: Photo) {
    this.projectService.patchProject(this.project().id, (project) => {
      const photos = [...(project.photos ?? []).filter((item) => item.id !== photo.id), photo];
      return withPhotoOrder(
        { ...project, photos },
        photos.map((item) => item.id)
      );
    });
  }

  /**
   * Sends the wanted order. The ids are read from the store when the request
   * starts, so a photo recorded or deleted by an earlier write is accounted for.
   */
  private sendOrder() {
    this.orderTimer = null;
    const projectId = this.project().id;
    if (this.orderRequests.size === 0 && sameOrder(this.desiredOrder, this.confirmedOrder)) {
      // Moved back to where it started (for example with Escape): nothing to save.
      this.confirmedOrder = this.desiredOrder = null;
      this.orderStatus.set('idle');
      return;
    }
    let sent: readonly number[] = [];
    const request = this.photoService
      .reorderPhotos(projectId, () => {
        const current = this.storedPhotoIds(projectId);
        sent = this.desiredOrder ? reconcileOrder(current, this.desiredOrder) : current;
        return sent;
      })
      .subscribe({
        complete: () => {
          this.orderRequests.delete(request);
          this.confirmedOrder = sent;
          if (this.orderRequests.size === 0 && this.orderTimer === null) {
            this.confirmedOrder = this.desiredOrder = null;
            this.orderStatus.set('saved');
          }
        },
        error: (err) => {
          console.error('Saving the photo order failed:', err);
          this.orderRequests.delete(request);
          this.revertOrder(projectId);
        },
      });
    this.orderRequests.add(request);
  }

  /** Drops the unsaved order and puts back the last one the server confirmed. */
  private revertOrder(projectId: number) {
    if (this.orderTimer !== null) clearTimeout(this.orderTimer);
    this.orderTimer = null;
    // Later moves would fail the same way and have not started; drop them.
    this.orderRequests.forEach((request) => request.unsubscribe());
    this.orderRequests.clear();
    const confirmed = this.confirmedOrder;
    this.confirmedOrder = this.desiredOrder = null;
    if (confirmed) this.projectService.patchProject(projectId, (project) => withPhotoOrder(project, confirmed));
    this.orderStatus.set('idle');
    this.notificationService.error(
      $localize`:@@photoOrderSaveFailed:Could not save the photo order. The previous order has been put back.`
    );
  }

  private storedPhotoIds(projectId: number): number[] {
    const project = this.projectService.projects().find((item) => item.id === projectId);
    return (project?.photos ?? []).map((photo) => photo.id);
  }

  private unhide(photoId: number) {
    this.hiddenPhotoIds.update((ids) => {
      const next = new Set(ids);
      next.delete(photoId);
      return next;
    });
  }

  private reportUploads({ done, failed }: UploadSummary) {
    if (failed === 0) {
      this.notificationService.success($localize`:@@photoUploadSuccess:Successfully uploaded ${done} photo(s)`);
      this.queue.clearDone();
    } else {
      this.notificationService.error(
        $localize`:@@photoUploadSomeFailed:${failed}:failed: photo(s) failed to upload. Retry them from the list.`
      );
    }
  }

  private reportRejected(rejected: RejectedFile[]) {
    const list = rejected.map(({ file, reason }) => `${file.name} (${reason})`).join(', ');
    this.notificationService.warning($localize`:@@photoFilesRejected:Skipped ${list}:files:`);
  }
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}
