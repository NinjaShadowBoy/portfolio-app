import { Injectable, signal } from '@angular/core';
import {
  Notification,
  NotificationAction,
} from './../interfaces/notification.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);

  public readonly notifications = this.notificationsSignal.asReadonly();

  show(notification: Omit<Notification, 'id'>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    this.notificationsSignal.update((notifications) => [
      ...notifications,
      newNotification,
    ]);

    if (newNotification.duration ?? 5000 > 0) {
      setTimeout(() => this.dismiss(id), newNotification.duration);
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
    this.notificationsSignal.update((notifications) =>
      notifications.filter((n) => n.id !== id)
    );
  }

  clear(): void {
    this.notificationsSignal.set([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
