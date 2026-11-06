import { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../../core/services/auth.service';
import { IdentityService } from '../../../core/services/identity.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let isAdmin: ReturnType<typeof signal<boolean>>;
  let auth: { logout: Mock };

  async function setup(locale: string): Promise<void> {
    isAuthenticated = signal(false);
    isAdmin = signal(false);
    auth = { logout: vi.fn().mockName('logout') };
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: LOCALE_ID, useValue: locale },
        {
          provide: AuthService,
          useValue: { ...auth, isAuthenticated, isAdmin, user: signal({ name: 'Ann', email: 'ann@example.com' }) },
        },
        { provide: IdentityService, useValue: { identity: signal(null) } },
        { provide: ThemeService, useValue: { currentTheme: signal('light'), toggleTheme: () => {} } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => (document.documentElement.style.overflow = ''));

  it('offers French from the English build and maps the current page under /fr', async () => {
    await setup('en');
    expect(component.langLabel).toBe('FR');
    expect(component.languageUrl('/projects/1')).toBe('/fr/projects/1');
    expect(component.languageUrl('/')).toBe('/fr/');
  });

  it('offers English from the French build at the root, dropping any /en prefix', async () => {
    await setup('fr');
    expect(component.langLabel).toBe('EN');
    expect(component.languageUrl('/projects/1')).toBe('/projects/1');
    expect(component.languageUrl('/en/about')).toBe('/about');
    expect(component.languageUrl('/en')).toBe('/');
  });

  it('links every public section in both the desktop and mobile menus', async () => {
    await setup('en');
    const host = fixture.nativeElement as HTMLElement;
    for (const menu of ['.desktop-nav', '.mobile-nav']) {
      for (const path of ['/home', '/projects', '/publications', '/about', '/contact']) {
        expect(host.querySelector(`${menu} a[href="${path}"]`), `${menu} ${path}`).toBeTruthy();
      }
    }
  });

  it('leaves login to the footer, and shows profile and admin links for an admin', async () => {
    await setup('en');
    const desktop = () => (fixture.nativeElement as HTMLElement).querySelector('.desktop-nav')!;

    expect(desktop().querySelector('a[href="/login"]')).toBeNull();
    expect(desktop().querySelector('a[href="/tools"]')).toBeNull();
    expect(desktop().querySelector('a[href="/admin"]')).toBeNull();

    isAuthenticated.set(true);
    isAdmin.set(true);
    fixture.detectChanges();

    expect(desktop().querySelector('.user-name')?.textContent).toContain('Ann');
    expect(desktop().querySelector('a[href="/admin"]')).toBeTruthy();
  });

  it('toggles the mobile menu and locks page scrolling while it is open', async () => {
    await setup('en');
    const host = fixture.nativeElement as HTMLElement;
    const hamburger = host.querySelector<HTMLButtonElement>('.hamburger')!;
    const sidebar = host.querySelector<HTMLElement>('.sidebar')!;
    const backdrop = host.querySelector<HTMLElement>('.backdrop')!;

    expect(sidebar.hasAttribute('inert')).toBe(true);

    hamburger.click();
    fixture.detectChanges();
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(sidebar.classList).toContain('open');
    expect(backdrop.classList).toContain('open');
    expect(sidebar.hasAttribute('inert')).toBe(false);

    hamburger.click();
    fixture.detectChanges();
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    expect(document.documentElement.style.overflow).toBe('');
    // The drawer stays in the DOM so closing only flips classes.
    expect(host.querySelector('.sidebar')).toBe(sidebar);
    expect(host.querySelector('.backdrop')).toBe(backdrop);
  });

  it('closes on Escape and gives focus back to the hamburger', async () => {
    await setup('en');
    const host = fixture.nativeElement as HTMLElement;
    const hamburger = host.querySelector<HTMLButtonElement>('.hamburger')!;
    // jsdom renders at desktop width, where the hamburger is display:none and cannot take focus.
    hamburger.style.display = 'inline-flex';
    hamburger.parentElement!.style.display = 'flex';

    hamburger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(host.querySelector('.sidebar .close-btn'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.isMenuOpen()).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.activeElement).toBe(hamburger);
  });

  it('puts the nav links first and CV, language and theme in one row after them', async () => {
    await setup('en');
    const sidebar = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.sidebar')!;
    const nav = sidebar.querySelector('.mobile-nav')!;
    const settings = sidebar.querySelector('.drawer-settings')!;

    expect(nav.querySelectorAll('a.drawer-link').length).toBe(5);
    expect(nav.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(settings.querySelector('app-cv-menu')).toBeTruthy();
    expect(settings.querySelector('.lang-toggle')?.textContent?.trim()).toBe('Français');
    expect(settings.querySelector('.theme-toggle')).toBeTruthy();
  });

  it('keeps Tab and Shift+Tab inside the open drawer', async () => {
    await setup('en');
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.hamburger')!.click();
    fixture.detectChanges();
    const sidebar = host.querySelector<HTMLElement>('.sidebar')!;
    const close = sidebar.querySelector<HTMLButtonElement>('.close-btn')!;
    const theme = sidebar.querySelector<HTMLButtonElement>('.drawer-settings .theme-toggle')!;
    const tab = (shiftKey: boolean) => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
      document.activeElement!.dispatchEvent(event);
      return event.defaultPrevented;
    };

    theme.focus();
    expect(tab(false)).toBe(true);
    expect(document.activeElement).toBe(close);

    expect(tab(true)).toBe(true);
    expect(document.activeElement).toBe(theme);

    // In the middle of the drawer the browser moves focus as usual.
    sidebar.querySelector<HTMLAnchorElement>('a.drawer-link')!.focus();
    expect(tab(false)).toBe(false);
  });

  it('closes on any navigation, such as browser back while it is open', async () => {
    await setup('en');
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.hamburger')!.click();
    fixture.detectChanges();
    expect(component.isMenuOpen()).toBe(true);

    await TestBed.inject(Router).navigateByUrl('/about');
    fixture.detectChanges();
    expect(component.isMenuOpen()).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes when the backdrop is tapped', async () => {
    await setup('en');
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.hamburger')!.click();
    fixture.detectChanges();

    host.querySelector<HTMLElement>('.backdrop')!.click();
    fixture.detectChanges();
    expect(component.isMenuOpen()).toBe(false);
  });
});
