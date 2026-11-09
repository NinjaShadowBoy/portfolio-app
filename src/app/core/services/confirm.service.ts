import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  createComponent,
  inject,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ConfirmDialogComponent, ConfirmOptions } from '../../shared/ui/confirm-dialog/confirm-dialog.component';

export type { ConfirmOptions, ConfirmTone } from '../../shared/ui/confirm-dialog/confirm-dialog.component';

/**
 * Asks a yes/no question in a modal dialog. Use it only for actions that
 * cannot be undone (for those that can, delete at once and offer Undo, see
 * `injectDeferDelete`) and for discarding unsaved work.
 *
 * The dialog is created on the first question and appended to <body>, so no
 * template needs to host it and the code ships only in the chunks that ask.
 * On the server there is nobody to ask, so the answer is always false.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private host: ComponentRef<ConfirmDialogComponent> | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve(false);
    return this.dialog().open(options);
  }

  ngOnDestroy() {
    if (!this.host) return;
    this.host.instance.settle(false);
    this.host.location.nativeElement.remove();
    this.host.destroy();
    this.host = null;
  }

  private dialog(): ConfirmDialogComponent {
    if (!this.host) {
      this.host = createComponent(ConfirmDialogComponent, { environmentInjector: this.injector });
      this.appRef.attachView(this.host.hostView);
      this.document.body.appendChild(this.host.location.nativeElement);
    }
    return this.host.instance;
  }
}
