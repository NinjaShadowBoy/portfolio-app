import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  let service: ConfirmService;

  const dialog = () => document.body.querySelector<HTMLDialogElement>('app-confirm-dialog dialog');
  const button = (selector: '[data-confirm]' | '[data-cancel]') =>
    dialog()!.querySelector<HTMLButtonElement>(selector)!;

  beforeEach(() => {
    service = TestBed.inject(ConfirmService);
  });

  it('opens a modal dialog with the title, body and labels', () => {
    void service.ask({ title: 'Delete Ann?', body: 'This cannot be undone.', confirmLabel: 'Delete user', tone: 'danger' });

    const el = dialog()!;
    expect(el.open).toBe(true);
    expect(el.getAttribute('role')).toBe('alertdialog');
    expect(el.querySelector('h2')?.textContent).toBe('Delete Ann?');
    expect(el.querySelector('p')?.textContent).toBe('This cannot be undone.');
    expect(button('[data-confirm]').textContent?.trim()).toBe('Delete user');
    expect(button('[data-confirm]').classList).toContain('btn-danger');
    expect(button('[data-cancel]').textContent?.trim()).toBe('Cancel');
  });

  it('starts a destructive question on Cancel and a plain one on Confirm', () => {
    void service.ask({ title: 'Delete?', tone: 'danger' });
    expect(document.activeElement).toBe(button('[data-cancel]'));

    void service.ask({ title: 'Continue?' });
    expect(document.activeElement).toBe(button('[data-confirm]'));
    expect(button('[data-confirm]').classList).toContain('btn-primary');
  });

  it('resolves true on confirm and closes', async () => {
    const answer = service.ask({ title: 'Continue?' });
    button('[data-confirm]').click();

    await expect(answer).resolves.toBe(true);
    expect(dialog()!.open).toBe(false);
  });

  it('resolves false on cancel', async () => {
    const answer = service.ask({ title: 'Continue?' });
    button('[data-cancel]').click();

    await expect(answer).resolves.toBe(false);
  });

  it('resolves false on Escape (the dialog cancel event)', async () => {
    const answer = service.ask({ title: 'Continue?' });
    const cancel = new Event('cancel', { cancelable: true });
    dialog()!.dispatchEvent(cancel);

    await expect(answer).resolves.toBe(false);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog()!.open).toBe(false);
  });

  it('resolves false on a backdrop click, but not on a click inside the panel', async () => {
    const answer = service.ask({ title: 'Continue?' });
    dialog()!.querySelector('h2')!.click();
    expect(dialog()!.open).toBe(true);

    dialog()!.click();
    await expect(answer).resolves.toBe(false);
  });

  it('answers an unanswered question with false when a new one is asked', async () => {
    const first = service.ask({ title: 'First?' });
    const second = service.ask({ title: 'Second?' });

    await expect(first).resolves.toBe(false);
    expect(dialog()!.querySelector('h2')?.textContent).toBe('Second?');
    button('[data-confirm]').click();
    await expect(second).resolves.toBe(true);
  });

  it('reuses one dialog host', () => {
    void service.ask({ title: 'One?' });
    void service.ask({ title: 'Two?' });
    expect(document.body.querySelectorAll('app-confirm-dialog').length).toBe(1);
  });

  it('removes the host when the app is torn down', () => {
    void service.ask({ title: 'One?' });
    TestBed.resetTestingModule();
    expect(document.body.querySelector('app-confirm-dialog')).toBeNull();
  });
});

describe('ConfirmService on the server', () => {
  it('answers false without rendering anything', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const service = TestBed.inject(ConfirmService);

    await expect(service.ask({ title: 'Delete?' })).resolves.toBe(false);
    expect(document.body.querySelector('app-confirm-dialog')).toBeNull();
  });
});
