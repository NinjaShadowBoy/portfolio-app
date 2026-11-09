import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { ChatMessage } from '../chat.service';
import { ChatBlock, classifyLink, parseBlocks } from './chat-markdown';

/** A file the visitor asked for: shown as a download button under the answer. */
interface DownloadCard {
  url: string;
  label: string;
  href: string;
  download: string;
}

/**
 * Renders one assistant answer from the safe Markdown subset. Every node comes
 * from an Angular binding; the template never uses innerHTML. External URLs
 * survive only when the API returned them for this conversation or they are a
 * profile host, and PDFs open in a new tab from the site root.
 */
@Component({
  selector: 'app-chat-message',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();
  /** URLs from this conversation's links events; they may render as anchors. */
  readonly allowedLinks = input<ReadonlySet<string>>(new Set());

  protected readonly blocks = computed<ChatBlock[]>(() =>
    parseBlocks(this.message().text, this.allowedLinks()),
  );

  /**
   * Only downloads get a button: every other link is already clickable in the
   * answer text, so a card repeating it would be noise.
   */
  protected readonly downloads = computed<DownloadCard[]>(() =>
    (this.message().links ?? []).flatMap((link) => {
      if (link.kind !== 'download') return [];
      const target = classifyLink(link.url, this.allowedLinks());
      if (!target?.download || !target.href) return [];
      return [{ url: link.url, label: link.title || target.download, href: target.href, download: target.download }];
    }),
  );
}
