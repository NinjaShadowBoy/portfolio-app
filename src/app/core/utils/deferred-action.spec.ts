import type { Mock } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { DEFERRED_DELETE_MS, DeferDelete, DeferDeleteOptions, injectDeferDelete } from './deferred-action';
import { NotificationService } from '../services/notification.service';

@Component({ template: '' })
class HostComponent {
  readonly deferDelete: DeferDelete = injectDeferDelete();
}

describe('injectDeferDelete', () => {
  let notifications: NotificationService;
  let deferDelete: DeferDelete;
  let destroy: () => void;
  let hide: Mock<() => void>;
  let restore: Mock<() => void>;
  let commit: Mock<() => Observable<unknown>>;

  const options = (extra: Partial<DeferDeleteOptions> = {}): DeferDeleteOptions => ({
    hide,
    restore,
    commit,
    message: 'Deleted "Lora".',
    ...extra,
  });
  const undoButton = () => notifications.notifications().at(-1)?.actions?.[0];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    hide = vi.fn();
    restore = vi.fn();
    commit = vi.fn<() => Observable<unknown>>(() => of(undefined));
    const fixture = TestBed.createComponent(HostComponent);
    notifications = TestBed.inject(NotificationService);
    deferDelete = fixture.componentInstance.deferDelete;
    destroy = () => fixture.destroy();
  });

  afterEach(() => vi.useRealTimers());

  it('hides at once, shows an Undo toast, and commits only when the delay ends', () => {
    const action = deferDelete(options());

    expect(hide).toHaveBeenCalledTimes(1);
    expect(notifications.notifications()).toEqual([
      expect.objectContaining({ type: 'info', message: 'Deleted "Lora".', duration: DEFERRED_DELETE_MS }),
    ]);
    expect(undoButton()?.label).toBe('Undo');

    vi.advanceTimersByTime(DEFERRED_DELETE_MS - 1);
    expect(commit).not.toHaveBeenCalled();
    expect(action.state).toBe('pending');

    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(action.state).toBe('committed');
    expect(restore).not.toHaveBeenCalled();
    expect(notifications.notifications()).toEqual([]);
  });

  it('honours a custom delay', () => {
    deferDelete(options({ delayMs: 1000 }));
    vi.advanceTimersByTime(1000);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('Undo restores, dismisses the toast and never commits', () => {
    const action = deferDelete(options());

    undoButton()!.action();

    expect(restore).toHaveBeenCalledTimes(1);
    expect(action.state).toBe('undone');
    expect(notifications.notifications()).toEqual([]);
    vi.advanceTimersByTime(DEFERRED_DELETE_MS * 2);
    expect(commit).not.toHaveBeenCalled();

    // A late second Undo (e.g. a double click) changes nothing.
    action.undo();
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('commits pending deletes at once when the component is destroyed', () => {
    deferDelete(options());
    deferDelete(options());

    destroy();

    expect(commit).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(DEFERRED_DELETE_MS);
    expect(commit).toHaveBeenCalledTimes(2);
  });

  it('commits pending deletes at once when the page is hidden', () => {
    deferDelete(options());

    window.dispatchEvent(new Event('pagehide'));

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('stops listening for pagehide once destroyed', () => {
    destroy();
    deferDelete(options());

    window.dispatchEvent(new Event('pagehide'));
    expect(commit).not.toHaveBeenCalled();
  });

  it('restores the item and shows an error when the commit fails', () => {
    commit.mockReturnValue(throwError(() => new Error('500')));
    const action = deferDelete(options({ errorMessage: 'Could not delete "Lora".' }));

    vi.advanceTimersByTime(DEFERRED_DELETE_MS);

    expect(action.state).toBe('failed');
    expect(restore).toHaveBeenCalledTimes(1);
    expect(notifications.notifications()).toEqual([
      expect.objectContaining({ type: 'error', message: 'Could not delete "Lora".' }),
    ]);
  });

  it('cannot be undone once the commit is under way', () => {
    const response = new Subject<void>();
    commit.mockReturnValue(response);
    const action = deferDelete(options());

    action.flush();
    action.undo();

    expect(action.state).toBe('committing');
    expect(restore).not.toHaveBeenCalled();
    response.complete();
    expect(action.state).toBe('committed');
  });
});
