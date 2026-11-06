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
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { CvMenuComponent } from '../cv-menu/cv-menu.component';
import { FlagComponent } from '../flag/flag.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, UserAvatarComponent, CvMenuComponent, FlagComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class HeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);
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

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.document.documentElement.style.overflow = ''));
    // Any navigation closes the drawer, including browser back while it is open.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenu(false));
  }

  readonly langLabel = this.otherLang.toUpperCase();
  readonly langAriaLabel = this.otherLang === 'fr' ? 'Switch to French' : 'Switch to English';

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
