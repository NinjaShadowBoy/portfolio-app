import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  LOCALE_ID,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, RouterLink, Router, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IdentityService } from '../../../core/services/identity.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ScrollStateService } from '../../../core/services/scroll-state.service';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { CvMenuComponent } from '../cv-menu/cv-menu.component';
import { FlagComponent } from '../flag/flag.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, UserAvatarComponent, CvMenuComponent, FlagComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '[class.scrolled-away]': 'scrollState.headerHidden()',
    '[class.menu-open]': 'isMenuOpen()',
    // A keyboard or screen reader user moving into the hidden header brings it back.
    '(focusin)': 'scrollState.revealHeader()',
  },
})
export class HeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);
  private uiState = inject(UiStateService);
  private router = inject(Router);
  readonly currentLang = inject(LOCALE_ID);
  readonly otherLang = this.currentLang === 'en' ? 'fr' : 'en';
  /** The other language named in itself, as language switchers usually do. */
  readonly otherLangName = this.otherLang === 'fr' ? 'Français' : 'English';

  readonly navItems = [
    { label: $localize`:Nav home link@@navHome:Home`, link: '/home' },
    { label: $localize`:Nav projects link@@navProjects:Projects`, link: '/projects' },
    { label: $localize`:Nav publications link@@navPublications:Publications`, link: '/publications' },
    { label: $localize`:Nav about link@@navAbout:About Me`, link: '/about' },
    { label: $localize`:Nav contact link@@navContact:Contact Me`, link: '/contact' },
  ];

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isAdmin = this.auth.isAdmin;
  readonly user = this.auth.user;
  readonly identity = inject(IdentityService).identity;
  readonly currentTheme = this.themeService.currentTheme;

  readonly isMenuOpen = signal(false);
  readonly isAnimating = signal(false);
  private readonly hamburger = viewChild<ElementRef<HTMLButtonElement>>('hamburger');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /** Phones only: the sticky header slides away while scrolling down and returns on scroll up. */
  readonly scrollState = inject(ScrollStateService);
  /**
   * Phones only: the browser prefers the other language, so the header shows the
   * switch instead of leaving it in the drawer. Browser-only, so SSR output is the same for all.
   */
  readonly suggestLanguage = signal(false);

  /** True when the first site language (en or fr) in the browser's list is not this page's. */
  prefersOtherLanguage(languages: readonly string[]): boolean {
    const preferred = languages.map((tag) => tag.toLowerCase().split('-')[0]).find((l) => l === 'en' || l === 'fr');
    return preferred === this.otherLang;
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.document.documentElement.style.overflow = ''));
    // Browser only: the server cannot know the visitor's languages.
    afterNextRender(() => {
      this.suggestLanguage.set(this.prefersOtherLanguage(this.document.defaultView?.navigator.languages ?? []));
    });
    // Any navigation closes the drawer, including browser back while it is open.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenu(false));
  }

  readonly langLabel = this.otherLang.toUpperCase();
  readonly langAriaLabel =
    this.otherLang === 'fr'
      ? $localize`:Header switch to French@@headerSwitchToFrench:Switch to French`
      : $localize`:Header switch to English@@headerSwitchToEnglish:Switch to English`;

  /**
   * The current page in the other locale. `en` is the source locale served at
   * `/` (no subPath in angular.json); only non-source locales get a URL prefix.
   */
  languageUrl(currentUrl = this.router.url): string {
    const path = currentUrl.replace(/^\/en(?=\/|$)/, '');
    const prefix = this.otherLang === 'en' ? '' : `/${this.otherLang}`;
    return `${prefix}${path}` || '/';
  }

  toggleLanguage() {
    // A full reload: the locale is a separate build, not a route.
    window.location.href = this.languageUrl();
  }

  toggleMenu() {
    if (this.isMenuOpen()) this.closeMenu();
    else this.openMenu();
  }

  openMenu() {
    if (this.isMenuOpen()) return;
    this.startTransition();
    this.isMenuOpen.set(true);
    this.uiState.setDrawerOpen(true);
    this.document.documentElement.style.overflow = 'hidden';
    // Focus once the drawer is visible; a visibility:hidden element cannot take focus.
    afterNextRender(() => this.closeButton()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }

  /** Closes the drawer. Focus goes back to the hamburger unless a link is taking the user elsewhere. */
  closeMenu(returnFocus = true) {
    if (!this.isMenuOpen()) return;
    this.startTransition();
    this.isMenuOpen.set(false);
    this.uiState.setDrawerOpen(false);
    this.document.documentElement.style.overflow = '';
    if (returnFocus) this.hamburger()?.nativeElement.focus({ preventScroll: true });
  }

  onEscape() {
    this.closeMenu();
  }

  /** Keeps Tab and Shift+Tab inside the open drawer (it is aria-modal). */
  onSidebarKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const sidebar = event.currentTarget as HTMLElement;
    const focusable = [...sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(
      (el) => el.checkVisibility?.() ?? true,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || !sidebar.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** `will-change` only while the drawer slides, so the layer is not kept alive when idle. */
  private startTransition() {
    const reduceMotion = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.isAnimating.set(!reduceMotion);
  }

  onSidebarTransitionEnd(event: TransitionEvent) {
    if (event.target === event.currentTarget && event.propertyName === 'transform') {
      this.isAnimating.set(false);
    }
  }


  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
