import { Injectable } from '@angular/core';

/**
 * Logs Core Web Vitals (FCP, LCP, FID, CLS) plus navigation timing to the
 * console, and a summary when the page is hidden. Browser only; the app root
 * calls `initializePerformanceMonitoring()` once at startup.
 */
@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {
  private metrics = new Map<string, number>();

  initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.observe('paint', (entries, observer) => {
      const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcp) {
        this.record('FCP', fcp.startTime, 1800);
        observer.disconnect();
      }
    });

    this.observe('largest-contentful-paint', (entries) => {
      const last = entries[entries.length - 1] as any;
      if (last) this.record('LCP', last.renderTime || last.loadTime, 2500);
    });

    this.observe('first-input', (entries, observer) => {
      const first = entries[0] as any;
      if (first) {
        this.record('FID', first.processingStart - first.startTime, 100);
        observer.disconnect();
      }
    });

    let cls = 0;
    this.observe('layout-shift', (entries) => {
      for (const entry of entries as any[]) {
        if (!entry.hadRecentInput) this.metrics.set('CLS', (cls += entry.value));
      }
    });
    window.addEventListener('pagehide', () => this.record('CLS', cls, 0.1));

    window.addEventListener('load', () => setTimeout(() => this.recordNavigationTiming(), 0));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.logSummary();
    });
  }

  /** Snapshot of every metric collected so far. */
  getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  private observe(
    entryType: string,
    handler: (entries: PerformanceEntry[], observer: PerformanceObserver) => void
  ): void {
    if (!('PerformanceObserver' in window)) return;
    try {
      const observer = new PerformanceObserver((list) => handler(list.getEntries(), observer));
      observer.observe({ entryTypes: [entryType] });
    } catch (e) {
      console.warn(`${entryType} observation failed:`, e);
    }
  }

  private recordNavigationTiming(): void {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;

    const ttfb = nav.responseStart - nav.requestStart;
    const dcl = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
    const loadComplete = nav.loadEventEnd - nav.loadEventStart;
    const total = nav.loadEventEnd - nav.fetchStart;

    this.record('TTFB', ttfb, 600);
    this.metrics.set('DCL', dcl);
    this.metrics.set('Load Complete', loadComplete);
    this.metrics.set('Total Load Time', total);

    console.log('📊 Navigation Timing Metrics:', {
      TTFB: `${ttfb.toFixed(2)}ms`,
      'DOM Content Loaded': `${dcl.toFixed(2)}ms`,
      'Load Complete': `${loadComplete.toFixed(2)}ms`,
      'Total Load Time': `${total.toFixed(2)}ms`,
    });
  }

  /** Store a metric and log it against its "good" threshold. */
  private record(name: string, value: number, goodThreshold: number): void {
    this.metrics.set(name, value);
    const status =
      value <= goodThreshold ? '✅ GOOD' : value <= goodThreshold * 1.5 ? '⚠️ NEEDS IMPROVEMENT' : '❌ POOR';
    console.log(`${status} ${name}: ${value.toFixed(2)}ms (Target: <${goodThreshold}ms)`);
  }

  private logSummary(): void {
    if (this.metrics.size === 0) return;
    console.log('📈 Performance Summary:');
    this.metrics.forEach((value, key) => console.log(`  ${key}: ${value.toFixed(2)}ms`));
  }
}
