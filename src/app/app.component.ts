import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/ui/header/header.component';
import { BreadcrumbComponent } from './shared/ui/breadcrumb/breadcrumb.component';
import { FooterComponent } from './shared/ui/footer/footer.component';
import { NotificationContainerComponent } from './shared/ui/notification-container/notification-container.component';
import { PerformanceMonitorService } from './core/services/performance-monitor.service';

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
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'portfolio-app';
  private performanceMonitor = inject(PerformanceMonitorService);

  constructor() {
    // Initialize performance monitoring in production
    // Comment out if you don't want console logs in production
    this.performanceMonitor.initializePerformanceMonitoring();
  }
}
