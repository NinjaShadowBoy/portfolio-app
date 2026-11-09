import { Observable, Subscription } from 'rxjs';

/**
 * Runs observables one at a time, in the order they are subscribed. `run(work)`
 * returns a cold observable; `work()` is called only when every earlier job has
 * completed, errored or been unsubscribed, so it can read state those jobs
 * changed. Callers' `next` and `complete` handlers run before the next job starts.
 */
export class SerialQueue {
  private readonly waiting: Array<() => void> = [];
  private busy = false;

  run<T>(work: () => Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      let state: 'waiting' | 'running' | 'finished' = 'waiting';
      let inner: Subscription | undefined;

      const finish = () => {
        if (state === 'finished') return;
        const wasRunning = state === 'running';
        state = 'finished';
        if (wasRunning) {
          this.busy = false;
          this.next();
        }
      };

      const start = () => {
        state = 'running';
        this.busy = true;
        try {
          inner = work().subscribe(subscriber);
        } catch (err) {
          subscriber.error(err);
        }
      };

      if (this.busy || this.waiting.length > 0) this.waiting.push(start);
      else start();

      return () => {
        if (state === 'waiting') {
          const index = this.waiting.indexOf(start);
          if (index !== -1) this.waiting.splice(index, 1);
          state = 'finished';
          return;
        }
        inner?.unsubscribe();
        finish();
      };
    });
  }

  private next() {
    if (this.busy) return;
    this.waiting.shift()?.();
  }
}
