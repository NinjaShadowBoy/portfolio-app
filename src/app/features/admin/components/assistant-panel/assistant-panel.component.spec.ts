import { Mocked } from 'vitest';
import { createSpyObj } from '../../../../../testing/create-spy-obj';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { AssistantPanelComponent } from './assistant-panel.component';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ChatUsage, KnowledgeIndex, KnowledgeLastSync } from '../../../../core/interfaces/admin.interface';

describe('AssistantPanelComponent', () => {
  let fixture: ComponentFixture<AssistantPanelComponent> | null = null;
  let component: AssistantPanelComponent;
  let admin: Mocked<AdminService>;
  let notification: Mocked<NotificationService>;

  const usage: ChatUsage = {
    days: [
      { day: '2026-11-09', requests: 2, inputTokens: 120, outputTokens: 80 },
      { day: '2026-11-08', requests: 0, inputTokens: 0, outputTokens: 0 },
    ],
    topSubjects: [
      { subject: 'u:42', requests: 2, inputTokens: 250, outputTokens: 110 },
      { subject: 'ip:1a2b3c', requests: 1, inputTokens: 100, outputTokens: 60 },
    ],
    today: { requests: 3, tokens: 210, tokenBudget: 2000000, budgetRemaining: 1999790 },
  };

  const lastSync: KnowledgeLastSync = {
    startedAt: '2026-11-09T09:29:40Z',
    finishedAt: '2026-11-09T09:30:00Z',
    added: 2,
    updated: 1,
    deleted: 3,
    unchanged: 6,
    error: null,
  };

  const knowledge = (over: Partial<KnowledgeIndex> = {}): KnowledgeIndex => ({
    enabled: true,
    sources: [
      {
        kind: 'publication',
        ref: 'cerc2026-tonal',
        lang: 'en',
        title: 'Tonal paper',
        url: '/publications',
        chunks: 4,
        updatedAt: '2026-11-09T09:30:00Z',
      },
    ],
    lastSync,
    syncing: false,
    ...over,
  });

  const render = async (): Promise<void> => {
    fixture?.destroy();
    fixture = TestBed.createComponent(AssistantPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Re-renders a fresh panel after changing a mock's return value. */
  const renderWith = async (
    usageData: ChatUsage | Error = usage,
    knowledgeData: KnowledgeIndex | Error = knowledge(),
  ): Promise<void> => {
    admin.getChatUsage.mockReturnValue(
      usageData instanceof Error ? throwError(() => usageData) : of(usageData),
    );
    admin.getKnowledge.mockReturnValue(
      knowledgeData instanceof Error ? throwError(() => knowledgeData) : of(knowledgeData),
    );
    await render();
  };

  const button = (label: string): HTMLButtonElement =>
    Array.from((fixture!.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === label)!;

  const dataTables = (): HTMLElement[] =>
    Array.from((fixture!.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('app-data-table'));

  beforeEach(async () => {
    admin = createSpyObj<AdminService>(['getChatUsage', 'getKnowledge', 'reindexKnowledge']);
    admin.getChatUsage.mockReturnValue(of(usage));
    admin.getKnowledge.mockReturnValue(of(knowledge()));
    admin.reindexKnowledge.mockReturnValue(of(lastSync));
    notification = createSpyObj<NotificationService>(['success', 'error', 'info', 'show', 'dismiss']);

    await TestBed.configureTestingModule({
      imports: [AssistantPanelComponent],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();
    await render();
  });

  it("shows today's counters, the budget meter and the daily chart with its hidden summary", () => {
    expect(admin.getChatUsage).toHaveBeenCalledWith(14);

    expect(fixture!.nativeElement.querySelector('.today-summary')!.textContent)
      .toContain('Today: 3 requests, 210 tokens');

    const meter = fixture!.nativeElement.querySelector('.budget-meter');
    expect(meter).not.toBeNull();
    expect(meter.getAttribute('aria-valuemax')).toBe('2000000');
    expect(meter.getAttribute('aria-valuenow')).toBe('210');
    expect(meter.getAttribute('aria-label')).toBe('Daily token budget');
    expect(meter.querySelector('.budget-meter-fill')!.getAttribute('style')).toContain('width');
    expect(fixture!.nativeElement.querySelector('.budget-label')!.textContent)
      .toContain('210 of 2000000 tokens');

    const bars = fixture!.nativeElement.querySelectorAll('.chart-svg rect');
    expect(bars.length).toBe(2);
    expect(bars[0].getAttribute('y')).toBe('48');
    const hiddenRows = fixture!.nativeElement.querySelectorAll('.visually-hidden tbody tr');
    expect(hiddenRows.length).toBe(2);
    expect(hiddenRows[0].textContent).toContain('2026-11-08');
  });

  it('hides the meter while no budget is configured', async () => {
    await renderWith({
      ...usage,
      today: { ...usage.today, tokenBudget: 0, budgetRemaining: 0 },
    });

    expect(fixture!.nativeElement.querySelector('.budget-meter')).toBeNull();
    expect(fixture!.nativeElement.querySelector('.today-summary')!.textContent)
      .toContain('Today: 3 requests, 210 tokens');
  });

  it('refetches usage with the chosen day range', async () => {
    const select: HTMLSelectElement = fixture!.nativeElement.querySelector('select');
    select.value = '30';
    select.dispatchEvent(new Event('change'));
    await fixture!.whenStable();
    fixture!.detectChanges();

    expect(admin.getChatUsage).toHaveBeenLastCalledWith(30);
  });

  it('lists the top subjects with their request and token counts', () => {
    const table = dataTables()[0];
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Subject', 'Requests', 'Input tokens', 'Output tokens']);

    const rows = table.querySelectorAll('tbody tr[data-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('th[scope="row"]')?.textContent).toContain('u:42');
    expect(rows[0].textContent).toContain('250');
  });

  it('renders the enabled badge, the last sync result and the sources', () => {
    const status: HTMLElement = fixture!.nativeElement.querySelector('.sync-status');
    expect(status.textContent).toContain('Enabled');
    expect(status.textContent).toContain('took 20 s');
    expect(status.textContent).toContain('2 added, 1 updated, 3 deleted, 6 unchanged');
    expect(fixture!.nativeElement.querySelector('.sync-error')).toBeNull();

    const sources = dataTables()[1];
    expect(sources.querySelectorAll('tbody tr[data-row]').length).toBe(1);
    expect(sources.querySelector('td[data-label="Kind"]')!.textContent).toContain('Publication');
    expect(sources.textContent).toContain('Tonal paper');
    expect(sources.querySelector('a')!.getAttribute('href')).toBe('/publications');
    expect(sources.querySelector('td[data-label="Updated"]')!.textContent).toContain('Nov 9, 2026');
  });

  it('states every source column and filters by kind with the table filter', async () => {
    await renderWith(usage, knowledge({
      sources: [
        ...knowledge().sources,
        { kind: 'project', ref: 'portfolio-go', lang: 'en', title: 'This site', url: null, chunks: 7, updatedAt: '2026-11-01T00:00:00Z' },
      ],
    }));

    const sources = dataTables()[1];
    const headers = Array.from(sources.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Kind', 'Title', 'Lang', 'Chunks', 'Updated']);

    const filter: HTMLInputElement = sources.querySelector('.dt-filter')!;
    filter.value = 'project';
    filter.dispatchEvent(new Event('input'));
    await fixture!.whenStable();
    fixture!.detectChanges();

    const rows = sources.querySelectorAll('tbody tr[data-row]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('This site');
  });

  it('shows a failed sync in a danger callout', async () => {
    await renderWith(usage, knowledge({
      lastSync: { ...lastSync, error: 'Embedding request failed: quota exceeded' },
    }));

    const callout: HTMLElement = fixture!.nativeElement.querySelector('.sync-error');
    expect(callout.textContent).toContain('The last sync failed: Embedding request failed: quota exceeded');
  });

  it('refreshes the sync status and the sources after a reindex finishes', async () => {
    component.reindex();
    await fixture!.whenStable();
    fixture!.detectChanges();

    expect(admin.reindexKnowledge).toHaveBeenCalledTimes(1);
    expect(admin.getKnowledge).toHaveBeenCalledTimes(2);
    expect(component.reindexing()).toBe(false);
    expect(button('Reindex now')!.disabled).toBe(false);
  });

  it('offers an info toast when a sync is already running (409)', () => {
    admin.reindexKnowledge.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { code: 'KNOWLEDGE_SYNC_RUNNING', message: 'already running' },
    })));

    component.reindex();

    expect(notification.info).toHaveBeenCalledWith('A sync is already running');
    expect(notification.error).not.toHaveBeenCalled();
    expect(component.reindexing()).toBe(false);
  });

  it('explains on 503 that indexing needs the chat and its OpenRouter key', () => {
    admin.reindexKnowledge.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 503,
      error: { code: 'KNOWLEDGE_DISABLED', message: 'knowledge disabled' },
    })));

    component.reindex();

    expect(notification.error).toHaveBeenCalledWith(
      'Indexing is disabled: it needs CHAT_ENABLED=true and OPENROUTER_API_KEY',
    );
  });

  it('reports other reindex failures with the backend detail', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    admin.reindexKnowledge.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 500,
      error: { message: 'boom' },
    })));

    component.reindex();

    expect(notification.error).toHaveBeenCalledWith('Could not reindex the knowledge index: boom');
    expect(component.reindexing()).toBe(false);
  });

  it('disables reindexing while the server reports a running sync', async () => {
    await renderWith(usage, knowledge({ syncing: true }));

    const reindexing = button('Reindexing...');
    expect(reindexing).not.toBeNull();
    expect(reindexing.disabled).toBe(true);

    component.reindex();
    expect(admin.reindexKnowledge).not.toHaveBeenCalled();
  });

  it('shows the usage error state without giving up the rest', async () => {
    await renderWith(new Error('down'), knowledge());

    expect(fixture!.nativeElement.querySelector('.panel-empty')!.textContent)
      .toContain('Could not load usage.');
    expect(fixture!.nativeElement.querySelector('.sync-status')!.textContent).toContain('Enabled');
  });

  it('shows the knowledge error state', async () => {
    await renderWith(usage, new Error('down'));

    expect(fixture!.nativeElement.querySelector('.panel-empty')!.textContent)
      .toContain('Could not load the knowledge index.');
  });

  it('shows empty usage and empty knowledge states', async () => {
    await renderWith(
      { days: [], topSubjects: [], today: usage.today },
      knowledge({ enabled: false, sources: [], lastSync: null }),
    );

    expect(dataTables()[0].querySelector('.dt-state')!.textContent).toContain('No usage recorded yet.');
    expect(dataTables()[1].querySelector('.dt-state')!.textContent).toContain('No sources yet.');
    expect(fixture!.nativeElement.querySelector('.sync-status')!.textContent)
      .toContain('The index has never been synced.');
    expect(fixture!.nativeElement.querySelector('.sync-status')!.textContent).toContain('Disabled');
  });
});
