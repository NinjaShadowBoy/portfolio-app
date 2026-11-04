import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const STORAGE_KEY = 'theme-preference';

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  function setup(): ThemeService {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);
    TestBed.tick(); // flush the effects that persist and apply the theme
    return service;
  }

  it('applies a stored explicit preference to the document', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const service = setup();

    expect(service.getThemePreference()).toBe('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('follows the system preference when nothing is stored', () => {
    const service = setup();
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    expect(service.getThemePreference()).toBe('system');
    expect(service.currentTheme()).toBe(systemDark ? 'dark' : 'light');
  });

  it('toggleTheme flips the resolved theme and persists it as an explicit choice', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const service = setup();

    service.toggleTheme();
    TestBed.tick();

    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
