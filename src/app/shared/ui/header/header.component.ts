
import { Component, inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IdentityService } from '../../../core/services/identity.service';
import { SocialLinksService } from '../../../core/services/social-links.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UserAvatarComponent],
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

  isAuthenticated = this.auth.isAuthenticated;
  isAdmin = this.auth.isAdmin;
  user = this.auth.user;
  identity = this.identityService.identity;
  socialLinks = this.socialLinksService.getSocialLinks();
  currentTheme = this.themeService.currentTheme;

  isMenuOpen = false;
  cvPathEn = 'assets/docs/ABENA_ALEX_NELSON_RYAN_cv-en.pdf';
  cvPathFr = 'assets/docs/ABENA_ALEX_NELSON_RYAN_cv-fr.pdf';

  get langLabel(): string {
    return this.currentLang === 'en' ? 'FR' : 'EN';
  }

  get langAriaLabel(): string {
    return this.currentLang === 'en' ? 'Switch to French' : 'Switch to English';
  }

  toggleLanguage(): void {
    const pathWithoutLocale = this.router.url.replace(/^\/(?:en|fr)(?=\/|$)/, '') || '/home';
    window.location.assign(this.currentLang === 'fr' ? pathWithoutLocale : `/fr${pathWithoutLocale}`);
  }

  downloadCV(lang: 'en' | 'fr'): void {
    const link = document.createElement('a');
    link.href = lang === 'en' ? this.cvPathEn : this.cvPathFr;
    link.download = lang === 'en' ? 'ABENA_ALEX_NELSON_RYAN_cv-en.pdf' : 'ABENA_ALEX_NELSON_RYAN_cv-fr.pdf';
    link.click();
  }

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
