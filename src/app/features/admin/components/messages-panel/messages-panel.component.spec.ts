import { Mocked } from 'vitest';
import { createSpyObj } from '../../../../../testing/create-spy-obj';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { MessagesPanelComponent } from './messages-panel.component';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DEFERRED_DELETE_MS } from '../../../../core/utils/deferred-action';
import { ContactMessage } from '../../../../core/interfaces/admin.interface';

describe('MessagesPanelComponent', () => {
  let fixture: ComponentFixture<MessagesPanelComponent>;
  let component: MessagesPanelComponent;
  let admin: Mocked<AdminService>;
  let notification: Mocked<NotificationService>;

  const message = (id: number, extra: Partial<ContactMessage> = {}): ContactMessage =>
    ({
      id,
      name: `Sender ${id}`,
      email: `s${id}@example.com`,
      message: 'Hello',
      submittedAt: '2026-01-01T00:00:00Z',
      isRead: false,
      isReplied: false,
      ...extra,
    }) as ContactMessage;
  const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('tbody tr[data-row]'));

  beforeEach(async () => {
    admin = createSpyObj<AdminService>(['listMessages', 'markMessageRead', 'markMessageReplied', 'deleteMessage']);
    admin.listMessages.mockReturnValue(of([message(1), message(2, { isRead: true })]));
    admin.deleteMessage.mockReturnValue(of(undefined));
    notification = createSpyObj<NotificationService>(['success', 'error', 'show', 'dismiss']);
    notification.show.mockReturnValue('toast');

    await TestBed.configureTestingModule({
      imports: [MessagesPanelComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: admin },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MessagesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('marks a message read before the server answers', () => {
    const response = new Subject<ContactMessage>();
    admin.markMessageRead.mockReturnValue(response);

    component.markRead(message(1));
    fixture.detectChanges();

    expect(component.unreadCount()).toBe(0);
    expect(rows()[0].textContent).not.toContain('Unread');
    response.next(message(1, { isRead: true }));
    expect(component.unreadCount()).toBe(0);
  });

  it('marks it unread again when the request fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    admin.markMessageRead.mockReturnValue(throwError(() => new Error('500')));

    component.markRead(message(1));

    expect(component.unreadCount()).toBe(1);
    expect(notification.error).toHaveBeenCalledWith('Could not mark the message as read.');
  });

  it('hides a deleted message at once and deletes it after the Undo window', () => {
    vi.useFakeTimers();
    component.deleteMessage(message(1));
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(notification.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted the message from Sender 1.' })
    );
    expect(admin.deleteMessage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DEFERRED_DELETE_MS);
    expect(admin.deleteMessage).toHaveBeenCalledWith(1);
    fixture.detectChanges();
    expect(rows().length).toBe(1);
  });

  it('explains an empty inbox', async () => {
    admin.listMessages.mockReturnValue(of([]));
    fixture = TestBed.createComponent(MessagesPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const empty: HTMLElement = fixture.nativeElement.querySelector('.empty-state');
    expect(empty.textContent).toContain('No messages yet');
    expect(empty.querySelector('a')?.getAttribute('href')).toBe('/contact');
  });
});
