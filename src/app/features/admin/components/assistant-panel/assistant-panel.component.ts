import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ChatUsageSubject,
  KnowledgeIndex,
  KnowledgeSource,
  KnowledgeSourceKind,
} from '../../../../core/interfaces/admin.interface';
import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { DataTableCellDirective } from '../../../../shared/ui/data-table/data-table.directives';
import { DataTableColumn } from '../../../../shared/ui/data-table/data-table.model';

const SUBJECT_COLUMNS: DataTableColumn<ChatUsageSubject>[] = [
  { key: 'subject', header: 'Subject' },
  { key: 'requests', header: 'Requests', align: 'end' },
  { key: 'inputTokens', header: 'Input tokens', align: 'end' },
  { key: 'outputTokens', header: 'Output tokens', align: 'end' },
];

const SOURCE_COLUMNS: DataTableColumn<KnowledgeSource>[] = [
  { key: 'kind', header: 'Kind', width: '7rem' },
  { key: 'title', header: 'Title' },
  { key: 'lang', header: 'Lang', width: '4.5rem' },
  { key: 'chunks', header: 'Chunks', align: 'end', width: '6rem' },
  { key: 'updatedAt', header: 'Updated', width: '9rem' },
];

/** Admin view of the assistant: usage (requests, tokens, budget) and the knowledge index. */
@Component({
  selector: 'app-assistant-panel',
  imports: [DatePipe, DataTableComponent, DataTableCellDirective],
  templateUrl: './assistant-panel.component.html',
  styleUrls: ['../../admin-shared.css', './assistant-panel.component.css'],
})
export class AssistantPanelComponent {
  private admin = inject(AdminService);
  private notification = inject(NotificationService);

  /** Day windows the usage queries support (backend caps at 90). */
  readonly ranges = [7, 14, 30, 90];
  readonly days = signal(14);

  private usageResource = rxResource({
    params: () => ({ days: this.days() }),
    stream: ({ params }) => this.admin.getChatUsage(params.days),
  });
  private knowledgeResource = rxResource({ stream: () => this.admin.getKnowledge() });

  readonly usage = computed(() => (this.usageResource.hasValue() ? this.usageResource.value() : null));
  readonly usageLoading = this.usageResource.isLoading;
  readonly usageFailed = computed(() => this.usageResource.status() === 'error');

  /** Today's counters, separate so the Overview card and the meter can read them. */
  readonly todayUsage = computed(() => this.usage()?.today ?? null);
  /** The knowledge section. `null` until first load, then the server state. */
  readonly knowledge = computed(() =>
    this.knowledgeResource.hasValue() ? this.knowledgeResource.value() : null,
  );
  readonly knowledgeLoading = this.knowledgeResource.isLoading;
  readonly knowledgeFailed = computed(() => this.knowledgeResource.status() === 'error');

  readonly subjectColumns = SUBJECT_COLUMNS;
  readonly sourceColumns = SOURCE_COLUMNS;
  readonly subjectRowKey = (row: ChatUsageSubject) => row.subject;
  readonly sourceRowKey = (row: KnowledgeSource) => row.ref;
  readonly subjects = computed(() => this.usage()?.topSubjects ?? []);
  readonly sources = computed(() => this.knowledge()?.sources ?? []);
  /** Search box covers kind, title and language; kinds are a small closed set. */
  readonly sourceFilterBy = (source: KnowledgeSource) =>
    `${source.kind} ${source.title} ${source.lang} ${source.ref}`;

  readonly kindLabels: Record<KnowledgeSourceKind, string> = {
    project: 'Project',
    publication: 'Publication',
    cv: 'CV',
    about: 'About',
  };

  kindLabel(source: KnowledgeSource): string {
    return this.kindLabels[source.kind];
  }

  /** Controls the button while our own request is in flight; the server sets its own flag while its sync runs. */
  readonly reindexing = signal(false);

  /** Budget fill 0..100; hidden entirely while no budget is configured. */
  readonly budgetPercent = computed(() => {
    const today = this.todayUsage();
    if (!today || today.tokenBudget <= 0) return 0;
    return Math.min(100, Math.max(0, (today.tokens / today.tokenBudget) * 100));
  });

  /** Requests per day, oldest to the left, scaled to the tallest day. */
  readonly chartBars = computed(() => {
    const rangeDays = [...(this.usage()?.days ?? [])].reverse();
    const width = 200;
    const height = 48;
    const gap = 1.5;
    const maxRequests = Math.max(1, ...rangeDays.map((entry) => entry.requests));
    const barWidth = (width - gap * (rangeDays.length - 1)) / Math.max(1, rangeDays.length);
    return rangeDays.map((entry, index) => ({
      day: entry.day,
      requests: entry.requests,
      x: index * (barWidth + gap),
      y: height - (entry.requests / maxRequests) * height,
      width: barWidth,
      height: (entry.requests / maxRequests) * height,
    }));
  });

  /** Human "how long did the last sync take"; null when there is nothing to time. */
  readonly syncDuration = computed(() => {
    const sync = this.knowledge()?.lastSync;
    if (!sync?.startedAt || !sync.finishedAt) return null;
    const seconds = Math.round((Date.parse(sync.finishedAt) - Date.parse(sync.startedAt)) / 1000);
    if (Number.isNaN(seconds) || seconds < 0) return null;
    if (seconds < 60) return `${seconds} s`;
    return Math.floor(seconds / 60) > 0
      ? `${Math.floor(seconds / 60)} min ${seconds % 60} s`
      : `${seconds} s`;
  });

  /** "2 added, 1 updated, 3 deleted, 6 unchanged" for the last sync. */
  readonly syncCounts = computed(() => {
    const sync = this.knowledge()?.lastSync;
    if (!sync) return null;
    return `${sync.added} added, ${sync.updated} updated, ${sync.deleted} deleted, ${sync.unchanged} unchanged`;
  });

  setDays(value: string) {
    this.days.set(Number(value));
  }

  reindex() {
    if (this.reindexing() || this.knowledge()?.syncing) return;
    this.reindexing.set(true);
    this.admin.reindexKnowledge().subscribe({
      // 200 also covers a failed run (error set); the fresh data carries the story.
      next: () => {
        this.reindexing.set(false);
        this.knowledgeResource.reload();
      },
      error: (err: unknown) => {
        this.reindexing.set(false);
        this.reportReindexFailure(err);
      },
    });
  }

  // Safe and idempotent, so no confirm dialog.
  private reportReindexFailure(err: unknown) {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    if (status === 409) {
      this.notification.info('A sync is already running');
      return;
    }
    if (status === 503) {
      this.notification.error('Indexing is disabled: it needs CHAT_ENABLED=true and OPENROUTER_API_KEY');
      return;
    }
    this.fail('Could not reindex the knowledge index', err);
  }

  private fail(message: string, err: unknown) {
    console.error(message, err);
    const detail = (err as { error?: { message?: string } })?.error?.message;
    this.notification.error(detail ? `${message}: ${detail}` : `${message}.`);
  }
}
