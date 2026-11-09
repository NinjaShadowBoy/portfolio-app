import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ChatPaneComponent } from './chat-pane.component';
import { ChatMessage, ChatService, ChatStatus } from '../chat.service';
import { ChatUiService } from '../../../core/services/chat-ui.service';

interface FakeChat {
  messages: WritableSignal<ChatMessage[]>;
  status: WritableSignal<ChatStatus>;
  toolStatus: WritableSignal<string | null>;
  remainingToday: WritableSignal<number | null>;
  send: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

describe('ChatPaneComponent', () => {
  const originalMatchMedia = window.matchMedia;

  let fixture: ComponentFixture<ChatPaneComponent>;
  let chat: FakeChat;
  let chatUi: ChatUiService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    chat = {
      messages: signal<ChatMessage[]>([]),
      status: signal<ChatStatus>('idle'),
      toolStatus: signal<string | null>(null),
      remainingToday: signal<number | null>(null),
      send: vi.fn(),
      stop: vi.fn(),
      clear: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ChatPaneComponent],
      providers: [provideRouter([]), { provide: ChatService, useValue: chat }],
    });
    chatUi = TestBed.inject(ChatUiService);
  });

  afterEach(() => {
    fixture?.destroy();
    document.documentElement.style.removeProperty('--chat-pane-width');
    window.matchMedia = originalMatchMedia!;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /** The global stub reports no match; a test can opt into the mobile layout. */
  function narrowViewport(narrow = true): void {
    window.matchMedia = ((query: string) => ({
      matches: narrow && query.includes('max-width: 768px'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  function create(open = true): void {
    if (open) chatUi.openPane();
    fixture = TestBed.createComponent(ChatPaneComponent);
    fixture.detectChanges();
  }

  function textarea(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
  }

  function type(value: string): void {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('closes on Escape and returns focus to the launcher', () => {
    const launcher = document.createElement('button');
    launcher.setAttribute('aria-controls', 'chat-pane');
    document.body.appendChild(launcher);
    create();
    launcher.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(chatUi.open()).toBe(false);
    expect(document.activeElement).toBe(launcher);
    launcher.remove();
  });

  it('marks the log busy while an answer streams', () => {
    create();
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;

    chat.status.set('streaming');
    fixture.detectChanges();
    expect(log.getAttribute('aria-busy')).toBe('true');

    chat.status.set('idle');
    fixture.detectChanges();
    expect(log.getAttribute('aria-busy')).toBe('false');
  });

  it('announces only the finished reply', () => {
    create();
    chat.messages.set([
      { role: 'user', text: 'Hi' },
      { role: 'assistant', text: 'Hello there' },
    ]);
    chat.status.set('streaming');
    fixture.detectChanges();

    chat.status.set('idle');
    fixture.detectChanges();

    const live = fixture.nativeElement.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(live.textContent?.trim()).toBe('Hello there');
  });

  it('uses a modal dialog on a narrow viewport', () => {
    narrowViewport();
    create();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.id).toBe('chat-pane');
    expect(dialog.open).toBe(true);
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
  });

  it('sends on Enter and keeps Shift+Enter as a newline', () => {
    create();

    type('Hello');
    textarea().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(chat.send).toHaveBeenCalledWith('Hello');

    type('More');
    chat.send.mockClear();
    textarea().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }),
    );
    expect(chat.send).not.toHaveBeenCalled();
  });

  it('sends a starter prompt', () => {
    create();

    (fixture.nativeElement.querySelector('.chat-starter') as HTMLButtonElement).click();

    expect(chat.send).toHaveBeenCalledWith('What has Alex built with Go?');
  });

  it('changes the mascot mode through ChatUiService', () => {
    create();
    const spy = vi.spyOn(chatUi, 'setMascotMode');
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    select.value = 'still';
    select.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith('still');
  });

  it('sets and resets --chat-pane-width', () => {
    create();
    expect(document.documentElement.style.getPropertyValue('--chat-pane-width')).toBe('400px');

    chatUi.closePane();
    fixture.detectChanges();
    expect(document.documentElement.style.getPropertyValue('--chat-pane-width')).toBe('0px');
  });

  it('does not shift the page on a narrow viewport', () => {
    narrowViewport();
    create();

    expect(document.documentElement.style.getPropertyValue('--chat-pane-width')).toBe('0px');
  });

  it('starts a new conversation and focuses the composer', () => {
    create();

    (fixture.nativeElement.querySelector('.chat-action') as HTMLButtonElement).click();

    expect(chat.clear).toHaveBeenCalled();
    expect(document.activeElement).toBe(textarea());
  });

  it('shows the remaining hint only at five or fewer', () => {
    create();
    chat.remainingToday.set(6);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chat-remaining')).toBeNull();

    chat.remainingToday.set(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chat-remaining')?.textContent).toContain(
      '2 messages left today',
    );
  });
  it('shows the limited notice with a contact link', () => {
    create();
    chat.status.set('limited');
    fixture.detectChanges();

    const notice = fixture.nativeElement.querySelector('.chat-notice') as HTMLElement;
    expect(notice.textContent).toContain('message limit');
    expect(notice.querySelector('a')?.getAttribute('href')).toBe('/contact');
  });
});
