import { Injectable } from '@angular/core';

/**
 * Performance Monitoring Service
 *
 * Monitors Core Web Vitals and provides performance insights.
 * This service can be used to track:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 *
 * Usage:
 * - Inject this service in your root component
 * - Call initializePerformanceMonitoring() in ngOnInit
 * - Metrics will be logged to console and can be sent to analytics
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metricsCollected = new Map<string, number>();

  constructor() {}

  /**
   * Initialize performance monitoring
   * Call this method in AppComponent's ngOnInit
   */
  initializePerformanceMonitoring(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Monitor FCP
    this.observeFCP();

    // Monitor LCP
    this.observeLCP();

    // Monitor FID
    this.observeFID();

    // Monitor CLS
    this.observeCLS();

    // Monitor Navigation Timing
    this.observeNavigationTiming();

    // Log all metrics when page is hidden
    this.observePageVisibility();
  }

  /**
   * Observe First Contentful Paint
   */
  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime;
            this.metricsCollected.set('FCP', fcp);
            this.logMetric('FCP', fcp, 1800); // Target: < 1.8s
            observer.disconnect();
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP observation failed:', e);
    }
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        if (lastEntry) {
          const lcp = lastEntry.renderTime || lastEntry.loadTime;
          this.metricsCollected.set('LCP', lcp);
          this.logMetric('LCP', lcp, 2500); // Target: < 2.5s
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observation failed:', e);
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          this.metricsCollected.set('FID', fid);
          this.logMetric('FID', fid, 100); // Target: < 100ms
          observer.disconnect();
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observation failed:', e);
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.metricsCollected.set('CLS', clsValue);
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });

      // Log final CLS on page unload
      window.addEventListener('pagehide', () => {
        this.logMetric('CLS', clsValue, 0.1); // Target: < 0.1
      });
    } catch (e) {
      console.warn('CLS observation failed:', e);
    }
  }

  /**
   * Observe Navigation Timing metrics
   */
  private observeNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Wait for page to fully load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          // TTFB (Time to First Byte)
          const ttfb = navigation.responseStart - navigation.requestStart;
          this.metricsCollected.set('TTFB', ttfb);
          this.logMetric('TTFB', ttfb, 600); // Target: < 600ms

          // DOM Content Loaded
          const dcl = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
          this.metricsCollected.set('DCL', dcl);

          // Load Complete
          const loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
          this.metricsCollected.set('Load Complete', loadComplete);

          // Total Page Load Time
          const totalTime = navigation.loadEventEnd - navigation.fetchStart;
          this.metricsCollected.set('Total Load Time', totalTime);

          console.log('📊 Navigation Timing Metrics:', {
            'TTFB': `${ttfb.toFixed(2)}ms`,
            'DOM Content Loaded': `${dcl.toFixed(2)}ms`,
            'Load Complete': `${loadComplete.toFixed(2)}ms`,
            'Total Load Time': `${totalTime.toFixed(2)}ms`
          });
        }
      }, 0);
    });
  }

  /**
   * Log all metrics when page becomes hidden
   */
  private observePageVisibility(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.logAllMetrics();
      }
    });
  }

  /**
   * Log a single metric with performance assessment
   */
  private logMetric(name: string, value: number, goodThreshold: number): void {
    const status = value <= goodThreshold ? '✅ GOOD' :
                   value <= goodThreshold * 1.5 ? '⚠️ NEEDS IMPROVEMENT' :
                   '❌ POOR';

    console.log(`${status} ${name}: ${value.toFixed(2)}ms (Target: <${goodThreshold}ms)`);
  }

  /**
   * Log all collected metrics
   */
  private logAllMetrics(): void {
    if (this.metricsCollected.size === 0) {
      return;
    }

    console.log('📈 Performance Summary:');
    this.metricsCollected.forEach((value, key) => {
      console.log(`  ${key}: ${value.toFixed(2)}ms`);
    });
  }

  /**
   * Get all collected metrics
   * Useful for sending to analytics services
   */
  getMetrics(): Map<string, number> {
    return new Map(this.metricsCollected);
  }

  /**
   * Send metrics to analytics (placeholder)
   * Implement this to send metrics to your analytics service
   */
  sendMetricsToAnalytics(): void {
    const metrics: Record<string, number> = {};
    this.metricsCollected.forEach((value, key) => {
      metrics[key] = value;
    });

    // Example: Send to Google Analytics
    // if (typeof gtag !== 'undefined') {
    //   gtag('event', 'web_vitals', metrics);
    // }

    // Example: Send to custom analytics endpoint
    // fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metrics)
    // });

    console.log('📤 Metrics ready to send:', metrics);
  }
}
