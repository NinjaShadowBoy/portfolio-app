import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/ui/header/header.component';
import { BreadcrumbComponent } from './shared/ui/breadcrumb/breadcrumb.component';
import { FooterComponent } from './shared/ui/footer/footer.component';
import { NotificationContainerComponent } from './shared/ui/notification-container/notification-container.component';
import { IdentityService } from './core/services/identity.service';

@Component({
  selector: 'app-root',
  imports: [
    HeaderComponent,
    BreadcrumbComponent,
    RouterOutlet,
    FooterComponent,
    NotificationContainerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor() {
    // Resolve the current identity (real or anonymous) on startup.
    inject(IdentityService);
  }
}
