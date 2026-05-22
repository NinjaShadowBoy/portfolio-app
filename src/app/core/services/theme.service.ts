import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private readonly STORAGE_KEY = 'theme-preference';

  // Current theme preference (light, dark, or system)
  private themePreference = signal<Theme>(this.getInitialTheme());

  // Computed actual theme based on preference and system settings
  public readonly currentTheme = signal<'light' | 'dark'>(this.getInitialResolvedTheme());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Watch for theme preference changes
      effect(() => {
        const preference = this.themePreference();
        this.saveThemePreference(preference);
        const resolvedTheme = this.resolveTheme(preference);
        this.currentTheme.set(resolvedTheme);
      });

      // Watch for actual theme changes and apply to DOM
      effect(() => {
        this.applyTheme(this.currentTheme());
      });

      // Listen for system theme changes
      this.watchSystemTheme();
    }
  }

  /**
   * Get the current theme preference
   */
  getThemePreference(): Theme {
    return this.themePreference();
  }

  /**
   * Set theme preference
   */
  setTheme(theme: Theme): void {
    this.themePreference.set(theme);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const current = this.currentTheme();
    this.setTheme(current === 'light' ? 'dark' : 'light');
  }

  /**
   * Get initial theme from localStorage or default to system
   */
  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'system';
    }

    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    return saved || 'system';
  }

  /**
   * Get initial resolved theme
   */
  private getInitialResolvedTheme(): 'light' | 'dark' {
    const preference = this.getInitialTheme();
    return this.resolveTheme(preference);
  }

  /**
   * Resolve the actual theme based on preference and system settings
   */
  private resolveTheme(preference: Theme): 'light' | 'dark' {
    if (preference === 'system') {
      return this.getSystemTheme();
    }

    return preference;
  }

  /**
   * Get system theme preference
   */
  private getSystemTheme(): 'light' | 'dark' {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const html = document.documentElement;

    // Always set the data-theme attribute explicitly
    // This prevents CSS media query from overriding our choice
    html.setAttribute('data-theme', theme);
  }

  /**
   * Save theme preference to localStorage
   */
  private saveThemePreference(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  /**
   * Watch for system theme changes
   */
  private watchSystemTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', () => {
        if (this.themePreference() === 'system') {
          this.currentTheme.set(this.resolveTheme('system'));
        }
      });
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(() => {
        if (this.themePreference() === 'system') {
          this.currentTheme.set(this.resolveTheme('system'));
        }
      });
    }
  }
}
