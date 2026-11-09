import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/** How long the Undo toast stays before the delete is sent. */
export const DEFERRED_DELETE_MS = 6000;

export interface DeferDeleteOptions {
  /** Removes the item from view. Called at once. */
  hide: () => void;
  /** Puts the item back. Called on Undo, and when the commit fails. */
  restore: () => void;
  /** Sends the delete. Subscribed once, when the delay ends or on flush. */
  commit: () => Observable<unknown>;
  /** Toast text, e.g. `Deleted "Lora".` */
  message: string;
  /** Error toast text when the commit fails; the item is restored either way. */
  errorMessage?: string;
  delayMs?: number;
}

export type DeferredDeleteState = 'pending' | 'committing' | 'committed' | 'undone' | 'failed';

export interface DeferredDelete {
  readonly state: DeferredDeleteState;
  /** Cancels a pending delete and restores the item. No-op once committing. */
  undo(): void;
  /** Commits a pending delete now. */
  flush(): void;
}

export type DeferDelete = (options: DeferDeleteOptions) => DeferredDelete;

/**
 * Returns `deferDelete`, bound to the calling component's lifetime. Call it in
 * an injection context: `private readonly deferDelete = injectDeferDelete();`
 *
 * `deferDelete(options)` hides the item, shows a toast with Undo for
 * `delayMs`, then commits. Nothing reaches the server until the commit, so
 * Undo needs no backend support. Pending deletes are committed at once when
 * the component is destroyed or the page is hidden (`pagehide`), so leaving
 * the page does not silently cancel them. A request sent from `pagehide` can
 * still be cut off by the unload; the item then simply stays.
 */
export function injectDeferDelete(): DeferDelete {
  const notifications = inject(NotificationService);
  const view = isPlatformBrowser(inject(PLATFORM_ID)) ? inject(DOCUMENT).defaultView : null;
  const pending = new Set<DeferredDelete>();

  const flushAll = () => [...pending].forEach((action) => action.flush());
  view?.addEventListener('pagehide', flushAll);
  inject(DestroyRef).onDestroy(() => {
    view?.removeEventListener('pagehide', flushAll);
    flushAll();
  });

  return (options) => {
    const action = startDeferredDelete(options, notifications, () => pending.delete(action));
    pending.add(action);
    return action;
  };
}

function startDeferredDelete(
  options: DeferDeleteOptions,
  notifications: NotificationService,
  release: () => void,
): DeferredDelete {
  const delayMs = options.delayMs ?? DEFERRED_DELETE_MS;
  let state: DeferredDeleteState = 'pending';

  options.hide();
  const toastId = notifications.show({
    type: 'info',
    message: options.message,
    duration: delayMs,
    actions: [{ label: $localize`:@@deferredDeleteUndo:Undo`, action: () => action.undo() }],
  });
  const timer = setTimeout(() => action.flush(), delayMs);

  const settle = (next: DeferredDeleteState) => {
    state = next;
    clearTimeout(timer);
    notifications.dismiss(toastId);
    release();
  };

  const action: DeferredDelete = {
    get state() {
      return state;
    },
    undo() {
      if (state !== 'pending') return;
      settle('undone');
      options.restore();
    },
    flush() {
      if (state !== 'pending') return;
      settle('committing');
      options.commit().subscribe({
        complete: () => (state = 'committed'),
        error: (err) => {
          console.error('Deferred delete failed:', err);
          state = 'failed';
          options.restore();
          notifications.error(
            options.errorMessage ?? $localize`:@@deferredDeleteFailed:Could not delete it. It has been put back.`,
          );
        },
      });
    },
  };
  return action;
}
