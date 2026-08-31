import { Component, inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    UserAvatarComponent,
    FlagComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private identityService = inject(IdentityService);
  private socialLinksService = inject(SocialLinksService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  readonly currentLang = inject(LOCALE_ID);
  private readonly otherLang = this.currentLang === 'en' ? 'fr' : 'en';

  navItems: { label: string; link: string }[] = [
    { label: $localize`:Nav home link@@navHome:Home`, link: '/home' },
    { label: $localize`:Nav projects link@@navProjects:Projects`, link: '/projects' },
    { label: $localize`:Nav about link@@navAbout:About Me`, link: '/about' },
    { label: $localize`:Nav contact link@@navContact:Contact Me`, link: '/contact' },
  ];

  isAuthenticated = this.auth.isAuthenticated;
  isAdmin = this.auth.isAdmin;
  user = this.auth.user;
  identity = this.identityService.identity;
  socialLinks = this.socialLinksService.getSocialLinks();
  currentTheme = this.themeService.currentTheme;

  isMenuOpen = false;

  readonly langLabel = this.otherLang.toUpperCase();
  readonly langAriaLabel = this.otherLang === 'fr' ? 'Switch to French' : 'Switch to English';

  toggleLanguage() {
    window.location.href = `/${this.otherLang}${this.router.url}`;
  }

  readonly downloadCV = downloadCV;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;

    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  logout() {
    this.auth.logout();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
