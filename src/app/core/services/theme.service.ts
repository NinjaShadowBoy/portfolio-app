import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

const STORAGE_KEY = 'theme-preference';
const DARK_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The stored preference: an explicit theme or "follow the system". */
  private themePreference = signal<Theme>(this.loadPreference());

  /** The theme actually applied to the document. */
  readonly currentTheme = signal<ResolvedTheme>(this.resolve(this.themePreference()));

  constructor() {
    if (!this.isBrowser) return;

    effect(() => {
      const preference = this.themePreference();
      localStorage.setItem(STORAGE_KEY, preference);
      this.currentTheme.set(this.resolve(preference));
    });

    // Always set data-theme explicitly so the CSS media-query fallback never
    // overrides an explicit choice.
    effect(() => document.documentElement.setAttribute('data-theme', this.currentTheme()));

    const mediaQuery = window.matchMedia(DARK_QUERY);
    const followSystem = () => {
      if (this.themePreference() === 'system') this.currentTheme.set(this.resolve('system'));
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', followSystem);
    else mediaQuery.addListener(followSystem); // older Safari
  }

  getThemePreference(): Theme {
    return this.themePreference();
  }

  setTheme(theme: Theme): void {
    this.themePreference.set(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  private loadPreference(): Theme {
    return (this.isBrowser && (localStorage.getItem(STORAGE_KEY) as Theme | null)) || 'system';
  }

  private resolve(preference: Theme): ResolvedTheme {
    if (preference !== 'system') return preference;
    return this.isBrowser && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  }
}
