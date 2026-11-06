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
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IdentityService } from '../../../core/services/identity.service';
import { SocialLinksService } from '../../../core/services/social-links.service';
import { ThemeService } from '../../../core/services/theme.service';
import { CV_PATHS, downloadCV } from '../../../core/constants/cv';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { FlagComponent } from '../flag/flag.component';

@Component({
  selector: 'app-header',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, UserAvatarComponent, FlagComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  host: { '(document:keydown.escape)': 'onEscape()', '(window:scroll)': 'closeCvMenu()' },
})
export class HeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  readonly currentLang = inject(LOCALE_ID);
  private readonly otherLang = this.currentLang === 'en' ? 'fr' : 'en';

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
  readonly socialLinks = inject(SocialLinksService).getSocialLinks();
  readonly currentTheme = this.themeService.currentTheme;
  readonly downloadCV = downloadCV;
  readonly cvPaths = CV_PATHS;
  private readonly cvMenu = viewChild<ElementRef<HTMLElement>>('cvMenu');

  readonly isMenuOpen = signal(false);
  readonly isAnimating = signal(false);
  private readonly hamburger = viewChild<ElementRef<HTMLButtonElement>>('hamburger');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.document.documentElement.style.overflow = ''));
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

  /**
   * The CV menu is a popover so it renders in the top layer: the header clips
   * its overflow, so an absolutely positioned dropdown would be cut off.
   * Anchor positioning is not available everywhere, so the menu is placed
   * under its button when it opens.
   */
  onCvMenuToggle(event: Event) {
    if ((event as ToggleEvent).newState !== 'open') return;
    const menu = event.target as HTMLElement;
    const button = this.document.querySelector<HTMLElement>('[popovertarget="cv-menu"]');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${rect.left}px`;
  }

  closeCvMenu() {
    const menu = this.cvMenu()?.nativeElement;
    if (menu?.matches?.(':popover-open')) menu.hidePopover();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
