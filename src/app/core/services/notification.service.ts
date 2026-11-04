import { Injectable, signal } from '@angular/core';
import { Notification } from '../interfaces/notification.interface';

export const DEFAULT_NOTIFICATION_DURATION = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);

  readonly notifications = this.notificationsSignal.asReadonly();

  /** Show a notification. A duration of 0 keeps it until dismissed. */
  show(notification: Omit<Notification, 'id'>): string {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const duration = notification.duration ?? DEFAULT_NOTIFICATION_DURATION;

    this.notificationsSignal.update((list) => [...list, { ...notification, id, duration }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(message: string, duration?: number): string {
    return this.show({ type: 'success', message, duration });
  }

  error(message: string, duration?: number): string {
    return this.show({ type: 'error', message, duration });
  }

  info(message: string, duration?: number): string {
    return this.show({ type: 'info', message, duration });
  }

  warning(message: string, duration?: number): string {
    return this.show({ type: 'warning', message, duration });
  }

  dismiss(id: string): void {
    this.notificationsSignal.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notificationsSignal.set([]);
  }
}
