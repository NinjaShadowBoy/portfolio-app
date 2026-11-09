import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CHAT_MAX_TEXT, ChatService } from '../chat.service';
import { ChatUiService, MascotMode } from '../../../core/services/chat-ui.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';

/** Desktop side-sheet width; the mascot and toasts read it from :root. */
const PANE_WIDTH = 400;

/**
 * The assistant pane: a non-modal side sheet on desktop and a full-screen
 * modal `<dialog>` at 768px and below. The conversation lives in ChatService,
 * so closing the pane leaves a running answer alone.
 */
@Component({
  selector: 'app-chat-pane',
  imports: [NgTemplateOutlet, RouterLink, ChatMessageComponent],
  templateUrl: './chat-pane.component.html',
  styleUrl: './chat-pane.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class ChatPaneComponent {
  protected readonly chat = inject(ChatService);
  protected readonly chatUi = inject(ChatUiService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxText = CHAT_MAX_TEXT;
  protected readonly draft = signal('');
  protected readonly announcement = signal('');
  protected readonly narrow = signal(false);
  protected readonly streaming = computed(() => this.chat.status() === 'streaming');
  protected readonly remaining = this.chat.remainingToday;
  protected readonly counter = computed(() => `${this.draft().length} / ${this.maxText}`);

  /** URLs from this conversation's links events; only those may become anchors. */
  protected readonly allowedLinks = computed(
    () =>
      new Set(
        this.chat
          .messages()
          .flatMap((message) => (message.links ?? []).map((link) => link.url)),
      ),
  );

  protected readonly prompts = [
    $localize`:Chat starter prompt@@chatPromptGo:What has Alex built with Go?`,
    $localize`:Chat starter prompt@@chatPromptPapers:Summarise the research papers`,
    $localize`:Chat starter prompt@@chatPromptContact:How can I contact Alex?`,
  ];

  private readonly logRef = viewChild<ElementRef<HTMLElement>>('log');
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private wasStreaming = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const media = window.matchMedia('(max-width: 768px)');
      this.narrow.set(media.matches);
      const onChange = (event: MediaQueryListEvent) => this.narrow.set(event.matches);
      media.addEventListener?.('change', onChange);
      this.destroyRef.onDestroy(() => media.removeEventListener?.('change', onChange));
    }

    // Shift the toast stack and let the mascot dock; 0 when closed or full screen.
    effect(() => {
      const width = this.chatUi.open() && !this.narrow() ? PANE_WIDTH : 0;
      this.document.documentElement.style.setProperty('--chat-pane-width', `${width}px`);
    });

    // Open or close the modal, and move focus into the composer.
    effect(() => {
      this.chatUi.open();
      this.narrow();
      this.syncOpen();
    });
    afterNextRender(() => this.syncOpen());

    // Keep the newest answer in view as it streams.
    effect(() => {
      for (const message of this.chat.messages()) void message.text.length;
      const log = this.logRef()?.nativeElement;
      if (log) log.scrollTop = log.scrollHeight;
    });

    // Announce only the finished reply, never every token.
    effect(() => {
      if (this.chat.status() === 'streaming') {
        this.wasStreaming = true;
        return;
      }
      if (!this.wasStreaming) return;
      this.wasStreaming = false;
      const last = this.chat.messages().at(-1);
      if (last?.role === 'assistant' && last.text) this.announcement.set(last.text);
    });

    this.destroyRef.onDestroy(() =>
      this.document.documentElement.style.removeProperty('--chat-pane-width'),
    );
  }

  protected close(): void {
    this.chatUi.closePane();
    this.document.querySelector<HTMLElement>('[aria-controls="chat-pane"]')?.focus({ preventScroll: true });
  }

  protected onEscape(): void {
    if (this.chatUi.open()) this.close();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** The dialog closed without going through close() (for example a form submit). */
  protected onDialogClose(): void {
    if (this.chatUi.open()) this.chatUi.closePane();
  }

  protected newConversation(): void {
    this.chat.clear();
    this.draft.set('');
    this.focusComposer();
  }

  protected onMascotMode(event: Event): void {
    this.chatUi.setMascotMode((event.target as HTMLSelectElement).value as MascotMode);
  }

  protected send(text: string = this.draft()): void {
    const value = text.trim();
    if (!value) return;
    this.draft.set('');
    this.document.getElementById('chat-input')?.style.removeProperty('height');
    void this.chat.send(value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    this.send();
  }

  protected onDraft(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.draft.set(input.value);
    // Grow with the text up to the CSS max-height, then scroll.
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }

  private syncOpen(): void {
    const open = this.chatUi.open();
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog) {
      if (open && !dialog.open) dialog.showModal();
      else if (!open && dialog.open) dialog.close();
    }
    if (open) this.focusComposer();
  }

  private focusComposer(): void {
    this.document.getElementById('chat-input')?.focus({ preventScroll: true });
  }
}
