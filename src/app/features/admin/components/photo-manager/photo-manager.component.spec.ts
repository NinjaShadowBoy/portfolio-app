import { Component, computed, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';

import { PHOTO_ORDER_SAVE_DELAY_MS, PhotoManagerComponent } from './photo-manager.component';
import { MAX_PHOTO_BYTES } from './photo-upload-queue';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { DEFERRED_DELETE_MS } from '../../../../core/utils/deferred-action';
import { Photo, Project } from '../../../../core/interfaces/project.interface';
import { environment } from '../../../../../environments/environment';

const project = (photos: Photo[]): Project => ({
  id: 7,
  name: 'Lora',
  description: 'desc',
  technologies: [],
  githubLink: null,
  demoLink: null,
  challenges: null,
  whatILearned: null,
  averageRating: 0,
  totalRatings: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  featured: false,
  displayOrder: 0,
  photoUrls: photos.map((photo) => photo.photoUrl),
  photos,
});

/** The live store the admin page reads; patchProject changes it like the real service. */
class FakeProjects {
  readonly projects = signal<Project[]>([project([{ id: 1, photoUrl: 'https://cdn/old.png', projectId: 7, displayOrder: 0 }])]);
  patchProject = vi.fn((id: number, change: (p: Project) => Project) =>
    this.projects.update((list) => list.map((p) => (p.id === id ? change(p) : p)))
  );
}

/** Binds the manager the way ProjectEditorComponent does: a live store lookup, no modal wrapper. */
@Component({
  imports: [PhotoManagerComponent],
  template: `@if (photoProject(); as p) { <app-photo-manager [project]="p" /> }`,
})
class HostComponent {
  readonly store = inject(ProjectDataService) as unknown as FakeProjects;
  readonly photoProject = computed(() => this.store.projects().find((p) => p.id === 7) ?? null);
}

describe('PhotoManagerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let manager: PhotoManagerComponent;
  let http: HttpTestingController;
  let store: FakeProjects;
  let notifications: NotificationService;
  let confirm: { ask: ReturnType<typeof vi.fn> };
  let cloudinaryUrl: string;
  const photosUrl = `${environment.apiBaseUrl}/photos/7`;

  const image = (name: string, type = 'image/png') => new File(['x'], name, { type });
  const el = (): HTMLElement => fixture.nativeElement;
  const render = () => fixture.detectChanges();
  const gridUrls = () =>
    Array.from(el().querySelectorAll<HTMLImageElement>('.photos-grid img')).map((img) => img.getAttribute('src'));
  const queueRows = () => Array.from(el().querySelectorAll<HTMLElement>('.upload-item'));
  const uploads = (): TestRequest[] => http.match(cloudinaryUrl);
  const saved = (id: number, name = `p${id}`): Photo => ({ id, photoUrl: `https://cdn/${name}.png`, projectId: 7, displayOrder: 0 });

  beforeEach(async () => {
    store = new FakeProjects();
    confirm = { ask: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProjectDataService, useValue: store },
        { provide: ConfirmService, useValue: confirm },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
    cloudinaryUrl = TestBed.inject(CloudinaryService).uploadUrl;
    fixture = TestBed.createComponent(HostComponent);
    render();
    manager = fixture.debugElement.children[0].componentInstance;
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('shows per-file progress, then the new photo in the grid without reopening', () => {
    manager.addFiles([image('new.png')]);
    render();
    expect(queueRows()[0].textContent).toContain('Uploading 0%');

    const upload = http.expectOne(cloudinaryUrl);
    upload.event({ type: HttpEventType.UploadProgress, loaded: 40, total: 100 });
    render();
    expect(manager.queue.items()[0]).toEqual(expect.objectContaining({ status: 'uploading', progress: 40 }));
    expect(queueRows()[0].textContent).toContain('Uploading 40%');
    expect(queueRows()[0].querySelector('progress')?.value).toBe(40);

    upload.flush({ secure_url: 'https://cdn/new.png' });
    render();
    expect(queueRows()[0].textContent).toContain('Saving');

    const record = http.expectOne(photosUrl);
    expect(record.request.body).toEqual({ photoUrl: 'https://cdn/new.png', projectId: 7 });
    record.flush(saved(2, 'new'));
    render();

    // Regression: the grid follows the project store, so the upload shows at once,
    // appended last like the server does.
    expect(gridUrls()).toEqual(['https://cdn/old.png', 'https://cdn/new.png']);
    expect(store.projects()[0].photos?.map((p) => p.displayOrder)).toEqual([0, 1]);
    expect(store.projects()[0].photoUrls).toEqual(['https://cdn/old.png', 'https://cdn/new.png']);
    expect(el().querySelector('.existing-photos h3')?.textContent).toContain('(2)');
    expect(notifications.notifications().at(-1)).toEqual(
      expect.objectContaining({ type: 'success', message: 'Successfully uploaded 1 photo(s)' })
    );
    // Every file succeeded, so the queue clears itself.
    expect(queueRows()).toEqual([]);
  });

  it('keeps the successes when one file fails, and offers Retry and Remove for the failure', () => {
    manager.addFiles([image('good.png'), image('bad.png')]);
    const [good, bad] = uploads();

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    bad.flush({ error: { message: 'Invalid image file' } }, { status: 400, statusText: 'Bad Request' });
    good.flush({ secure_url: 'https://cdn/good.png' });
    http.expectOne(photosUrl).flush(saved(3, 'good'));
    render();

    expect(gridUrls()).toContain('https://cdn/good.png');
    const rows = queueRows();
    expect(rows.map((row) => row.dataset['status'])).toEqual(['done', 'failed']);
    expect(rows[1].textContent).toContain('Failed: Invalid image file');
    expect(notifications.notifications().at(-1)).toEqual(
      expect.objectContaining({ type: 'error', message: '1 photo(s) failed to upload. Retry them from the list.' })
    );

    const retry = Array.from(rows[1].querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Retry')!;
    retry.click();
    render();
    expect(queueRows()[1].dataset['status']).toBe('uploading');
    http.expectOne(cloudinaryUrl).flush({ secure_url: 'https://cdn/bad.png' });
    http.expectOne(photosUrl).flush(saved(4, 'bad'));
    render();
    expect(gridUrls()).toContain('https://cdn/bad.png');
  });

  it('uploads three files at a time', () => {
    manager.addFiles([image('a.png'), image('b.png'), image('c.png'), image('d.png')]);
    const first = uploads();
    expect(first.length).toBe(3);
    expect(manager.queue.items()[3].status).toBe('queued');
    render();
    expect(queueRows()[3].textContent).toContain('Waiting');

    first[0].flush({ secure_url: 'https://cdn/a.png' });
    http.expectOne(photosUrl).flush(saved(5, 'a'));
    const next = uploads();
    expect(next.length).toBe(1);
    expect((next[0].request.body as FormData).get('file')).toEqual(expect.objectContaining({ name: 'd.png' }));

    [first[1], first[2], next[0]].forEach((req, i) => {
      req.flush({ secure_url: `https://cdn/x${i}.png` });
      http.expectOne(photosUrl).flush(saved(10 + i));
    });
    expect(store.projects()[0].photos?.length).toBe(5);
  });

  it('refuses files of the wrong type or size before uploading', () => {
    const huge = image('huge.png');
    Object.defineProperty(huge, 'size', { value: MAX_PHOTO_BYTES + 1 });

    manager.addFiles([image('notes.txt', 'text/plain'), huge, image('ok.webp', 'image/webp')]);

    expect(uploads().length).toBe(1);
    expect(notifications.notifications().at(-1)?.message).toBe(
      'Skipped notes.txt (not a JPEG, PNG, GIF, WebP or AVIF image), huge.png (larger than 10 MB)'
    );
    manager.queue.dispose();
  });

  it('accepts dropped and pasted image files, scoped to the manager section', () => {
    const drop = {
      dataTransfer: { types: ['Files'], files: [image('dropped.png')] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;
    manager.onDrop(drop);
    expect(drop.preventDefault).toHaveBeenCalled();

    const paste = Object.assign(new Event('paste', { cancelable: true }), {
      clipboardData: { files: [image('pasted.png')] },
    });
    // The paste listener sits on the manager host now, not the whole document.
    fixture.nativeElement.querySelector('app-photo-manager').dispatchEvent(paste);
    expect(paste.defaultPrevented).toBe(true);

    expect(manager.queue.items().map((item) => item.file.name)).toEqual(['dropped.png', 'pasted.png']);
    expect(uploads().length).toBe(2);
    manager.queue.dispose();
  });

  it('releases previews when a file is removed and when the manager closes', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    manager.addFiles([image('a.png'), image('b.png')]);
    const [a] = manager.queue.items();
    const [first, second] = uploads();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    first.flush({}, { status: 500, statusText: 'Server Error' });

    manager.queue.remove(a.id);
    expect(revoke).toHaveBeenCalledWith(a.previewUrl);

    const b = manager.queue.items()[0];
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith(b.previewUrl);
    expect(second.cancelled).toBe(true);
  });

  it('hides a deleted photo at once and deletes it after the Undo window', () => {
    vi.useFakeTimers();
    const del = Array.from(el().querySelectorAll<HTMLButtonElement>('.btn-delete-photo'))[0];
    del.click();
    render();
    expect(gridUrls()).toEqual([]);
    expect(el().querySelector('.empty-state')?.textContent).toContain('No photos yet');
    http.expectNone(`${environment.apiBaseUrl}/photos/1`);

    vi.advanceTimersByTime(DEFERRED_DELETE_MS);
    const req = http.expectOne(`${environment.apiBaseUrl}/photos/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(store.projects()[0].photos).toEqual([]);
    expect(store.projects()[0].photoUrls).toEqual([]);
  });

  it('puts the photo back on Undo', () => {
    vi.useFakeTimers();
    el().querySelector<HTMLButtonElement>('.btn-delete-photo')!.click();
    notifications.notifications().at(-1)!.actions![0].action();
    render();

    expect(gridUrls()).toEqual(['https://cdn/old.png']);
    vi.advanceTimersByTime(DEFERRED_DELETE_MS);
    http.expectNone(`${environment.apiBaseUrl}/photos/1`);
  });

  it('asks before closing while uploads are running', async () => {
    manager.addFiles([image('a.png')]);
    confirm.ask.mockResolvedValue(false);

    await expect(manager.canClose()).resolves.toBe(false);
    expect(confirm.ask).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger' }));

    confirm.ask.mockResolvedValue(true);
    await expect(manager.canClose()).resolves.toBe(true);
    // Destroying the manager disposes the queue, which cancels the upload.
    manager.queue.dispose();
    expect(http.expectOne(cloudinaryUrl).cancelled).toBe(true);
  });

  it('closes without asking when nothing is uploading', async () => {
    await expect(manager.canClose()).resolves.toBe(true);
    expect(confirm.ask).not.toHaveBeenCalled();
  });

  describe('ordering', () => {
    const orderUrl = `${environment.apiBaseUrl}/projects/7/photos/order`;
    const ids = () => store.projects()[0].photos?.map((p) => p.id);
    const tileOf = (id: number) =>
      el().querySelector<HTMLImageElement>(`.photos-grid img[src="https://cdn/p${id}.png"]`)!.closest<HTMLElement>('.photo-item')!;
    const button = (id: number, move: 'earlier' | 'later' | 'cover') =>
      tileOf(id).querySelector<HTMLButtonElement>(`button[data-move="${move}"]`)!;
    const deleteButton = (id: number) => tileOf(id).querySelector<HTMLButtonElement>('.btn-delete-photo')!;
    const status = () => el().querySelector('.order-status')?.textContent?.trim();

    beforeEach(() => {
      vi.useFakeTimers();
      store.projects.set([project([saved(1), saved(2), saved(3)])]);
      render();
    });

    it('shows the cover badge on the first photo and disables moves past the ends', () => {
      expect(tileOf(1).querySelector('.cover-badge')?.textContent).toBe('Cover');
      expect(tileOf(2).querySelector('.cover-badge')).toBeNull();
      expect(button(1, 'earlier').disabled).toBe(true);
      expect(button(1, 'cover').disabled).toBe(true);
      expect(button(3, 'later').disabled).toBe(true);
      expect(button(2, 'cover').disabled).toBe(false);
    });

    it('makes a photo the cover at once, then saves the full order after the debounce', () => {
      button(3, 'cover').click();
      render();

      expect(gridUrls()).toEqual(['https://cdn/p3.png', 'https://cdn/p1.png', 'https://cdn/p2.png']);
      expect(tileOf(3).querySelector('.cover-badge')).not.toBeNull();
      const stored = store.projects()[0];
      expect(stored.photos?.map((p) => [p.id, p.displayOrder])).toEqual([[3, 0], [1, 1], [2, 2]]);
      expect(stored.photoUrls).toEqual(['https://cdn/p3.png', 'https://cdn/p1.png', 'https://cdn/p2.png']);
      expect(status()).toBe('Saving order…');

      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS - 1);
      http.expectNone(orderUrl);
      vi.advanceTimersByTime(1);
      const req = http.expectOne(orderUrl);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ ids: [3, 1, 2] });
      req.flush(null, { status: 204, statusText: 'No Content' });
      render();
      expect(status()).toBe('Order saved');
    });

    it('coalesces rapid moves from the buttons into one request', () => {
      button(1, 'later').click();
      render();
      expect(ids()).toEqual([2, 1, 3]);
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS / 2);
      button(1, 'later').click();
      render();
      expect(ids()).toEqual([2, 3, 1]);
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS / 2);
      button(3, 'earlier').click();
      render();
      expect(ids()).toEqual([3, 2, 1]);

      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS - 1);
      http.expectNone(orderUrl);
      vi.advanceTimersByTime(1);
      expect(http.expectOne(orderUrl).request.body).toEqual({ ids: [3, 2, 1] });
    });

    it('sends nothing when the photos end up where they started', () => {
      button(1, 'later').click();
      render();
      button(1, 'earlier').click();
      render();
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS);
      render();
      http.expectNone(orderUrl);
      expect(ids()).toEqual([1, 2, 3]);
      expect(status()).toBe('');
    });

    it('puts back the last saved order and shows an error when the save fails', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      button(2, 'cover').click();
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS);
      http.expectOne(orderUrl).flush(null, { status: 204, statusText: 'No Content' });
      render();

      button(3, 'cover').click();
      render();
      expect(ids()).toEqual([3, 2, 1]);
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS);
      http.expectOne(orderUrl).flush({ error: 'ids must list every photo' }, { status: 400, statusText: 'Bad Request' });
      render();

      expect(ids()).toEqual([2, 1, 3]);
      expect(gridUrls()).toEqual(['https://cdn/p2.png', 'https://cdn/p1.png', 'https://cdn/p3.png']);
      expect(notifications.notifications().at(-1)).toEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Could not save the photo order. The previous order has been put back.',
        })
      );
      expect(status()).toBe('');
    });

    it('keeps a photo waiting out its Undo window in the order it sends, and deletes it after the save', () => {
      deleteButton(2).click();
      render();
      expect(gridUrls()).toEqual(['https://cdn/p1.png', 'https://cdn/p3.png']);

      button(3, 'cover').click();
      render();
      expect(gridUrls()).toEqual(['https://cdn/p3.png', 'https://cdn/p1.png']);

      // The hidden photo is still on the server, so it stays in the list, in its slot.
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS);
      const order = http.expectOne(orderUrl);
      expect(order.request.body).toEqual({ ids: [3, 2, 1] });

      // The Undo window ends while the order is in flight: the delete waits for it.
      vi.advanceTimersByTime(DEFERRED_DELETE_MS);
      http.expectNone(`${environment.apiBaseUrl}/photos/2`);
      order.flush(null, { status: 204, statusText: 'No Content' });
      http.expectOne(`${environment.apiBaseUrl}/photos/2`).flush(null);
      expect(ids()).toEqual([3, 1]);
    });

    it('puts an undone photo back in its slot', () => {
      deleteButton(1).click();
      render();
      button(3, 'earlier').click();
      notifications.notifications().find((n) => n.actions?.length)!.actions![0].action();
      render();

      expect(gridUrls()).toEqual(['https://cdn/p1.png', 'https://cdn/p3.png', 'https://cdn/p2.png']);
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS);
      expect(http.expectOne(orderUrl).request.body).toEqual({ ids: [1, 3, 2] });
    });

    it('waits for a delete in flight, then sends the list without the deleted photo', () => {
      deleteButton(2).click();
      vi.advanceTimersByTime(DEFERRED_DELETE_MS);
      const del = http.expectOne(`${environment.apiBaseUrl}/photos/2`);
      render();

      button(3, 'cover').click();
      vi.advanceTimersByTime(PHOTO_ORDER_SAVE_DELAY_MS);
      http.expectNone(orderUrl);

      del.flush(null);
      expect(http.expectOne(orderUrl).request.body).toEqual({ ids: [3, 1] });
    });

    it('saves a pending order at once when the manager closes', () => {
      button(2, 'cover').click();
      fixture.destroy();
      expect(http.expectOne(orderUrl).request.body).toEqual({ ids: [2, 1, 3] });
    });
  });
});
