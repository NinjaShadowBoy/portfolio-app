import { Subject, of, throwError } from 'rxjs';
import { SerialQueue } from './serial-queue';

describe('SerialQueue', () => {
  it('starts each job only after the previous one finishes', () => {
    const queue = new SerialQueue();
    const first = new Subject<string>();
    const log: string[] = [];

    queue.run(() => (log.push('start 1'), first)).subscribe({ complete: () => log.push('done 1') });
    queue.run(() => (log.push('start 2'), of('b'))).subscribe({ complete: () => log.push('done 2') });
    expect(log).toEqual(['start 1']);

    first.next('a');
    first.complete();
    expect(log).toEqual(['start 1', 'done 1', 'start 2', 'done 2']);
  });

  it('moves on after an error', () => {
    const queue = new SerialQueue();
    const errors: unknown[] = [];
    const second = vi.fn(() => of(2));

    queue.run(() => throwError(() => 'boom')).subscribe({ error: (err) => errors.push(err) });
    queue.run(second).subscribe();

    expect(errors).toEqual(['boom']);
    expect(second).toHaveBeenCalled();
  });

  it('skips a job unsubscribed while waiting, and frees the slot when a running job is unsubscribed', () => {
    const queue = new SerialQueue();
    const running = new Subject<void>();
    const skipped = vi.fn(() => of(1));
    const last = vi.fn(() => of(2));

    const first = queue.run(() => running).subscribe();
    queue.run(skipped).subscribe().unsubscribe();
    queue.run(last).subscribe();

    first.unsubscribe();
    expect(running.observed).toBe(false);
    expect(skipped).not.toHaveBeenCalled();
    expect(last).toHaveBeenCalled();
  });
});
