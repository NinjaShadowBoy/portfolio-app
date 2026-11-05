import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationAction } from '../../../core/interfaces/notification.interface';

const ICONS: Record<Notification['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

@Component({
  selector: 'app-notification-container',
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.css',
})
export class NotificationContainerComponent {
  private notificationService = inject(NotificationService);

  readonly notifications = this.notificationService.notifications;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  executeAction(notification: Notification, action: NotificationAction): void {
    action.action();
    this.dismiss(notification.id);
  }

  getIcon(type: string): string {
    return ICONS[type as Notification['type']] ?? '';
  }
}
