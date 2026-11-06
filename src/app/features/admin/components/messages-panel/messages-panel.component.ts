import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ContactMessage } from '../../../../core/interfaces/admin.interface';
import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { DataTableActionsDirective, DataTableCellDirective } from '../../../../shared/ui/data-table/data-table.directives';
import { DataTableColumn } from '../../../../shared/ui/data-table/data-table.model';

const MESSAGE_COLUMNS: DataTableColumn<ContactMessage>[] = [
  { key: 'from', header: 'From', sortable: true, value: (message) => message.name },
  { key: 'message', header: 'Message' },
  { key: 'submittedAt', header: 'Received', sortable: true },
];

/** Contact form inbox. The backend returns every message newest first, unpaged. */
@Component({
  selector: 'app-messages-panel',
  imports: [DatePipe, DataTableComponent, DataTableCellDirective, DataTableActionsDirective],
  templateUrl: './messages-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class MessagesPanelComponent {
  private admin = inject(AdminService);
  private notification = inject(NotificationService);

  readonly unreadOnly = signal(false);
  readonly busyId = signal<number | null>(null);

  private messagesResource = rxResource({ stream: () => this.admin.listMessages() });

  private readonly messages = computed<ContactMessage[] | null>(() =>
    this.messagesResource.hasValue() ? this.messagesResource.value() : null,
  );
  readonly visible = computed(() => {
    const messages = this.messages();
    if (!messages) return null;
    return this.unreadOnly() ? messages.filter((message) => !message.isRead) : messages;
  });
  readonly unreadCount = computed(() => this.messages()?.filter((message) => !message.isRead).length ?? 0);
  readonly failed = computed(() => this.messagesResource.status() === 'error');

  readonly columns = MESSAGE_COLUMNS;
  readonly rowKey = (message: ContactMessage) => message.id;
  readonly isUnread = (message: ContactMessage) => !message.isRead;
  readonly filterBy = (message: ContactMessage) => `${message.name} ${message.email} ${message.message}`;

  replyLink(message: ContactMessage): string {
    // Encoded: the backend accepts `?` and `&` in an address, which would
    // otherwise add headers such as `cc=` to the reply.
    return `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent('Re: your message on alexabena.me')}`;
  }

  markRead(message: ContactMessage) {
    this.apply(message, this.admin.markMessageRead(message.id), 'Could not mark the message as read.');
  }

  markReplied(message: ContactMessage) {
    this.apply(message, this.admin.markMessageReplied(message.id), 'Could not mark the message as replied.');
  }

  deleteMessage(message: ContactMessage) {
    if (!confirm(`Delete the message from ${message.name}? This cannot be undone.`)) return;

    this.busyId.set(message.id);
    this.admin.deleteMessage(message.id).subscribe({
      next: () => {
        this.messagesResource.update((messages) => messages?.filter((item) => item.id !== message.id));
        this.notification.success('Message deleted.');
        this.busyId.set(null);
      },
      error: (err) => this.fail('Could not delete the message.', err),
    });
  }

  /** Runs a status change and swaps the returned message into the list. */
  private apply(message: ContactMessage, request: Observable<ContactMessage>, failure: string) {
    this.busyId.set(message.id);
    request.subscribe({
      next: (updated) => {
        this.messagesResource.update((messages) =>
          messages?.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.busyId.set(null);
      },
      error: (err) => this.fail(failure, err),
    });
  }

  private fail(message: string, err: unknown) {
    console.error(message, err);
    this.notification.error(message);
    this.busyId.set(null);
  }
}
