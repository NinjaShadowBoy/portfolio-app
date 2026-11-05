import { Component, inject, LOCALE_ID, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IdentityService } from '../../../core/services/identity.service';
import { SocialLinksService } from '../../../core/services/social-links.service';
import { ThemeService } from '../../../core/services/theme.service';
import { downloadCV } from '../../../core/constants/cv';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { FlagComponent } from '../flag/flag.component';

@Component({
  selector: 'app-header',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, UserAvatarComponent, FlagComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  readonly currentLang = inject(LOCALE_ID);
  private readonly otherLang = this.currentLang === 'en' ? 'fr' : 'en';

  readonly navItems = [
    { label: $localize`:Nav home link@@navHome:Home`, link: '/home' },
    { label: $localize`:Nav projects link@@navProjects:Projects`, link: '/projects' },
    { label: $localize`:Nav articles link@@navArticles:Articles`, link: '/articles' },
    { label: $localize`:Nav tools link@@navTools:Tools`, link: '/tools' },
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

  readonly isMenuOpen = signal(false);

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
    this.isMenuOpen.update((open) => !open);
    document.body.style.overflow = this.isMenuOpen() ? 'hidden' : '';
  }

  logout() {
    this.auth.logout();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
