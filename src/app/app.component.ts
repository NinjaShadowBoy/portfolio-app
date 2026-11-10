import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/ui/header/header.component';
import { BreadcrumbComponent } from './shared/ui/breadcrumb/breadcrumb.component';
import { FooterComponent } from './shared/ui/footer/footer.component';
import { NotificationContainerComponent } from './shared/ui/notification-container/notification-container.component';
import { BackToTopComponent } from './shared/ui/back-to-top/back-to-top.component';
import { MascotComponent } from './features/chat/mascot/mascot.component';
import { ChatPaneComponent } from './features/chat/chat-pane/chat-pane.component';
import { ChatUiService } from './core/services/chat-ui.service';
import { IdentityService } from './core/services/identity.service';

@Component({
  selector: 'app-root',
  imports: [
    HeaderComponent,
    BreadcrumbComponent,
    RouterOutlet,
    FooterComponent,
    NotificationContainerComponent,
    BackToTopComponent,
    MascotComponent,
    ChatPaneComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /** The pane chunk is fetched the first time the launcher opens it. */
  protected readonly chatUi = inject(ChatUiService);

  /**
   * A plain #fragment link resolves against <base href>, so it would navigate
   * to the home page. Move focus to <main> instead.
   */
  skipToMain(event: Event) {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  constructor() {
    // Resolve the current identity (real or anonymous) on startup.
    inject(IdentityService);
  }
}
