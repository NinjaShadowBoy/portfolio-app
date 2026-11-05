import { TestBed } from '@angular/core/testing';

import { DEFAULT_NOTIFICATION_DURATION, NotificationService } from './notification.service';

describe('NotificationService', () => {
  afterEach(() => vi.useRealTimers());

  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('auto-dismisses after the default duration', () => {
    vi.useFakeTimers();
    service.success('Saved');

    expect(service.notifications()).toEqual([
      expect.objectContaining({ type: 'success', message: 'Saved', duration: DEFAULT_NOTIFICATION_DURATION }),
    ]);
    vi.advanceTimersByTime(DEFAULT_NOTIFICATION_DURATION - 1);
    expect(service.notifications().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(service.notifications().length).toBe(0);
  });

  it('keeps a notification with duration 0 until it is dismissed', () => {
    vi.useFakeTimers();
    const id = service.error('Needs attention', 0);

    vi.advanceTimersByTime(60_000);
    expect(service.notifications().length).toBe(1);
    service.dismiss(id);
    expect(service.notifications().length).toBe(0);
  });

  it('dismiss removes only the matching notification and clear removes all', () => {
    vi.useFakeTimers();
    const first = service.info('one', 0);
    service.warning('two', 0);

    service.dismiss(first);
    expect(service.notifications().map((n) => n.message)).toEqual(['two']);

    service.clear();
    expect(service.notifications()).toEqual([]);
  });
});
