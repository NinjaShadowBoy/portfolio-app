import { computed, signal } from '@angular/core';
import { EMPTY, Observable, Subject, Subscription, catchError, defer, finalize, mergeMap, tap } from 'rxjs';
import { Photo } from '../../../../core/interfaces/project.interface';
import { PhotoUploadEvent } from '../../../../core/services/photo.service';

/** MIME types the queue accepts; also the file input's `accept`. */
export const ACCEPTED_PHOTO_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];
/** Largest file the queue accepts (10 MB, Cloudinary's free-plan image limit). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
/** Uploads running at once. */
export const UPLOAD_CONCURRENCY = 3;

export type UploadStatus = 'queued' | 'uploading' | 'saving' | 'done' | 'failed';

export interface UploadItem {
  readonly id: number;
  readonly file: File;
  /** Object URL of the local file, for the thumbnail. Revoked when the item leaves the queue. */
  readonly previewUrl: string;
  readonly status: UploadStatus;
  /** 0-100 while uploading. */
  readonly progress: number;
  readonly error: string | null;
}

export interface RejectedFile {
  readonly file: File;
  readonly reason: string;
}

export interface UploadSummary {
  readonly done: number;
  readonly failed: number;
}

export interface PhotoPreviews {
  create(file: File): string;
  revoke(url: string): void;
}

export interface PhotoUploadQueueOptions {
  /** Starts one upload. Subscribed when a slot is free; unsubscribing cancels it. */
  upload: (file: File) => Observable<PhotoUploadEvent>;
  /** Called with each stored photo as soon as its upload finishes. */
  onSaved: (photo: Photo) => void;
  /** Called when the queue goes idle, with the results since it last went idle. */
  onIdle?: (summary: UploadSummary) => void;
  concurrency?: number;
  previews?: PhotoPreviews;
}

const ACTIVE: ReadonlySet<UploadStatus> = new Set(['queued', 'uploading', 'saving']);

const objectUrlPreviews: PhotoPreviews = {
  create: (file) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : ''),
  revoke: (url) => {
    if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  },
};

/** Why the queue refuses a file, or null when it accepts it. */
export function photoFileProblem(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return 'not a JPEG, PNG, GIF, WebP or AVIF image';
  if (file.size > MAX_PHOTO_BYTES) return `larger than ${MAX_PHOTO_BYTES / (1024 * 1024)} MB`;
  return null;
}

function errorMessage(err: unknown): string {
  const body = (err as { error?: { message?: unknown } } | null)?.error;
  if (typeof body?.message === 'string' && body.message) return body.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Upload failed';
}

/**
 * Per-file photo uploads, `concurrency` at a time. Each file moves through
 * queued -> uploading(progress) -> saving -> done, or to failed, where it can
 * be retried or removed. One failure does not affect the other files.
 *
 * Plain class with signals, not a service: the photo manager owns one per open
 * project and calls `dispose()` when it is destroyed.
 */
export class PhotoUploadQueue {
  private readonly state = signal<readonly UploadItem[]>([]);
  readonly items = this.state.asReadonly();
  /** True while any file is queued, uploading or saving. */
  readonly active = computed(() => this.items().some((item) => ACTIVE.has(item.status)));
  readonly activeCount = computed(() => this.items().filter((item) => ACTIVE.has(item.status)).length);
  readonly doneCount = computed(() => this.items().filter((item) => item.status === 'done').length);

  private readonly starts = new Subject<number>();
  private readonly subscription: Subscription;
  private readonly previews: PhotoPreviews;
  private nextId = 1;
  private summary = { done: 0, failed: 0 };
  private disposed = false;

  constructor(private readonly options: PhotoUploadQueueOptions) {
    this.previews = options.previews ?? objectUrlPreviews;
    this.subscription = this.starts
      .pipe(mergeMap((id) => this.run(id), options.concurrency ?? UPLOAD_CONCURRENCY))
      .subscribe();
  }

  /** Queues the acceptable files and starts them. Returns the refused ones. */
  add(files: Iterable<File>): RejectedFile[] {
    const rejected: RejectedFile[] = [];
    const added: UploadItem[] = [];
    for (const file of files) {
      const reason = photoFileProblem(file);
      if (reason) {
        rejected.push({ file, reason });
        continue;
      }
      added.push({
        id: this.nextId++,
        file,
        previewUrl: this.previews.create(file),
        status: 'queued',
        progress: 0,
        error: null,
      });
    }
    if (added.length > 0) {
      this.state.update((items) => [...items, ...added]);
      added.forEach((item) => this.starts.next(item.id));
    }
    return rejected;
  }

  retry(id: number) {
    if (this.find(id)?.status !== 'failed') return;
    this.patch(id, { status: 'queued', progress: 0, error: null });
    this.starts.next(id);
  }

  /** Drops a queued or failed file. A file that is uploading or saving cannot be removed. */
  remove(id: number) {
    const item = this.find(id);
    if (!item || item.status === 'uploading' || item.status === 'saving') return;
    this.drop((candidate) => candidate.id === id);
  }

  /** Drops the uploaded files; their photos are in the project by now. */
  clearDone() {
    this.drop((item) => item.status === 'done');
  }

  /** Cancels running uploads and releases every preview. */
  dispose() {
    this.disposed = true;
    this.subscription.unsubscribe();
    this.drop(() => true);
  }

  private run(id: number): Observable<unknown> {
    return defer(() => {
      const item = this.find(id);
      // Removed, or already restarted, while it waited for a slot.
      if (!item || item.status !== 'queued') return EMPTY;
      this.patch(id, { status: 'uploading', progress: 0 });
      return this.options.upload(item.file).pipe(
        tap((event) => {
          switch (event.type) {
            case 'progress':
              this.patch(id, { progress: event.percent });
              break;
            case 'saving':
              this.patch(id, { status: 'saving', progress: 100 });
              break;
            case 'done':
              this.patch(id, { status: 'done', progress: 100 });
              this.summary.done++;
              this.options.onSaved(event.photo);
              break;
          }
        }),
        catchError((err) => {
          this.patch(id, { status: 'failed', error: errorMessage(err) });
          this.summary.failed++;
          return EMPTY;
        }),
        finalize(() => this.reportIfIdle())
      );
    });
  }

  private reportIfIdle() {
    if (this.disposed || this.active()) return;
    const summary = this.summary;
    this.summary = { done: 0, failed: 0 };
    if (summary.done + summary.failed > 0) this.options.onIdle?.(summary);
  }

  private find(id: number): UploadItem | undefined {
    return this.items().find((item) => item.id === id);
  }

  private patch(id: number, change: Partial<UploadItem>) {
    this.state.update((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }

  private drop(match: (item: UploadItem) => boolean) {
    const items = this.items();
    items.filter(match).forEach((item) => this.previews.revoke(item.previewUrl));
    this.state.set(items.filter((item) => !match(item)));
  }
}
