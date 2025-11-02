import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { FooterComponent } from './footer/footer.component';
import { NotificationContainerComponent } from './notification-container/notification-container.component';
import { PerformanceMonitorService } from './services/performance-monitor.service';

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
export class AppComponent implements OnInit {
  title = 'portfolio-app';
  private performanceMonitor = inject(PerformanceMonitorService);

  ngOnInit(): void {
    // Initialize performance monitoring in production
    // Comment out if you don't want console logs in production
    this.performanceMonitor.initializePerformanceMonitoring();
  }
}
