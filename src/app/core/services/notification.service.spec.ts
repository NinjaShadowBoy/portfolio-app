import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { DEFAULT_NOTIFICATION_DURATION, NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('auto-dismisses after the default duration', fakeAsync(() => {
    service.success('Saved');

    expect(service.notifications()).toEqual([
      jasmine.objectContaining({ type: 'success', message: 'Saved', duration: DEFAULT_NOTIFICATION_DURATION }),
    ]);
    tick(DEFAULT_NOTIFICATION_DURATION - 1);
    expect(service.notifications().length).toBe(1);
    tick(1);
    expect(service.notifications().length).toBe(0);
  }));

  it('keeps a notification with duration 0 until it is dismissed', fakeAsync(() => {
    const id = service.error('Needs attention', 0);

    tick(60_000);
    expect(service.notifications().length).toBe(1);
    service.dismiss(id);
    expect(service.notifications().length).toBe(0);
  }));

  it('dismiss removes only the matching notification and clear removes all', fakeAsync(() => {
    const first = service.info('one', 0);
    service.warning('two', 0);

    service.dismiss(first);
    expect(service.notifications().map((n) => n.message)).toEqual(['two']);

    service.clear();
    expect(service.notifications()).toEqual([]);
  }));
});
