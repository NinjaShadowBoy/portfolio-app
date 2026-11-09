import { ChangeDetectorRef, Component, ElementRef, inject, signal, viewChild } from '@angular/core';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  /** One or two sentences naming what happens; omit when the title says it all. */
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` styles the confirm button as destructive and focuses Cancel first. */
  tone?: ConfirmTone;
}

type ConfirmRequest = Required<ConfirmOptions>;

/**
 * The modal behind `ConfirmService.ask()`. A native `<dialog>` opened with
 * `showModal()`, so the browser supplies the top layer, the focus trap, inert
 * page content, Escape, and focus return on close. Created on demand by the
 * service; do not place it in a template.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly request = signal<ConfirmRequest | null>(null);
  private resolve: ((confirmed: boolean) => void) | null = null;

  /** Shows the question and resolves with the answer. A newer question answers an open one with false. */
  open(options: ConfirmOptions): Promise<boolean> {
    this.settle(false);
    const request: ConfirmRequest = {
      title: options.title,
      body: options.body ?? '',
      confirmLabel: options.confirmLabel ?? $localize`:@@confirmDialogConfirm:Confirm`,
      cancelLabel: options.cancelLabel ?? $localize`:@@confirmDialogCancel:Cancel`,
      tone: options.tone ?? 'default',
    };
    this.request.set(request);
    // Render the buttons now so they exist to receive focus.
    this.cdr.detectChanges();

    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) dialog.showModal();
    // A destructive action starts on Cancel, so a stray Enter does nothing harmful.
    dialog
      .querySelector<HTMLButtonElement>(request.tone === 'danger' ? '[data-cancel]' : '[data-confirm]')
      ?.focus();

    return new Promise((resolve) => (this.resolve = resolve));
  }

  settle(confirmed: boolean) {
    const resolve = this.resolve;
    if (!resolve) return;
    this.resolve = null;
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) dialog.close();
    resolve(confirmed);
  }

  /** Escape. Handled here rather than left to the browser so the answer is always false. */
  onCancel(event: Event) {
    event.preventDefault();
    this.settle(false);
  }

  /** The dialog closed some other way (for example a form with method="dialog"). */
  onClose() {
    this.settle(false);
  }

  /** A click on the dialog element itself, outside the panel, landed on the backdrop. */
  onDialogClick(event: MouseEvent) {
    if (event.target === this.dialogRef().nativeElement) this.settle(false);
  }
}
