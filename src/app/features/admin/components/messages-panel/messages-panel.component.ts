import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { injectDeferDelete } from '../../../../core/utils/deferred-action';
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
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, DataTableActionsDirective],
  templateUrl: './messages-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class MessagesPanelComponent {
  private admin = inject(AdminService);
  private notification = inject(NotificationService);
  private readonly deferDelete = injectDeferDelete();

  readonly unreadOnly = signal(false);
  /** Messages waiting out their Undo window. */
  private readonly hiddenIds = signal<ReadonlySet<number>>(new Set());

  private messagesResource = rxResource({ stream: () => this.admin.listMessages() });

  private readonly messages = computed<ContactMessage[] | null>(() => {
    if (!this.messagesResource.hasValue()) return null;
    const hidden = this.hiddenIds();
    return this.messagesResource.value().filter((message) => !hidden.has(message.id));
  });
  readonly visible = computed(() => {
    const messages = this.messages();
    if (!messages) return null;
    return this.unreadOnly() ? messages.filter((message) => !message.isRead) : messages;
  });
  readonly unreadCount = computed(() => this.messages()?.filter((message) => !message.isRead).length ?? 0);
  readonly failed = computed(() => this.messagesResource.status() === 'error');
  /** Loaded, and nothing to list (under the current unread filter). */
  readonly empty = computed(() => this.visible()?.length === 0);

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
    this.applyOptimistic(message, { isRead: true }, this.admin.markMessageRead(message.id),
      'Could not mark the message as read.');
  }

  markReplied(message: ContactMessage) {
    this.applyOptimistic(message, { isRead: true, isReplied: true }, this.admin.markMessageReplied(message.id),
      'Could not mark the message as replied.');
  }

  deleteMessage(message: ContactMessage) {
    this.deferDelete({
      hide: () => this.hiddenIds.update((ids) => new Set(ids).add(message.id)),
      restore: () => this.unhide(message.id),
      commit: () =>
        this.admin.deleteMessage(message.id).pipe(
          tap(() => {
            this.messagesResource.update((messages) => messages?.filter((item) => item.id !== message.id));
            this.unhide(message.id);
          }),
        ),
      message: `Deleted the message from ${message.name}.`,
      errorMessage: 'Could not delete the message. It is back in the list.',
    });
  }

  /**
   * Shows the change at once, then sends it. The response replaces the row;
   * an error puts the previous values back.
   */
  private applyOptimistic(
    message: ContactMessage,
    change: Partial<ContactMessage>,
    request: Observable<ContactMessage>,
    failure: string,
  ) {
    const previous = { isRead: message.isRead, isReplied: message.isReplied };
    this.patch(message.id, change);
    request.subscribe({
      next: (updated) => {
        this.messagesResource.update((messages) =>
          messages?.map((item) => (item.id === updated.id ? updated : item)),
        );
      },
      error: (err) => {
        console.error(failure, err);
        this.patch(message.id, previous);
        this.notification.error(failure);
      },
    });
  }

  private patch(id: number, change: Partial<ContactMessage>) {
    this.messagesResource.update((messages) =>
      messages?.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  }

  private unhide(id: number) {
    this.hiddenIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }
}
