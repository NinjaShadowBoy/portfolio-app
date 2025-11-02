import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../interfaces/notification.interface';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-container.component.html',
  styleUrls: ['./notification-container.component.css'],
})
export class NotificationContainerComponent {
  private notificationService = inject(NotificationService);

  notifications = this.notificationService.notifications;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  executeAction(notification: Notification, actionIndex: number): void {
    if (notification.actions && notification.actions[actionIndex]) {
      notification.actions[actionIndex].action();
      this.dismiss(notification.id);
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  }
}
