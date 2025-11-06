import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SocialLinksService } from '../services/social-links.service';
import { ThemeService } from '../services/theme.service';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, UserAvatarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  title: string = 'Alex Nelson Abena';
  nickname: string = 'NinjaShadowBoy';
  subtitle: string = 'Junior Software Engineer and Student';
  description: string =
    'I am a software engineer with a passion for building web applications and mobile applications.';

  navItems: { label: string; link: string }[] = [
    { label: 'Home', link: '/home' },
    { label: 'Projects', link: '/projects' },
    { label: 'About Me', link: '/about' },
    { label: 'Contact Me', link: '/contact' },
    // {label: 'Blog', link: '/blog'},
    // {label: 'Resume', link: '/resume'},
    // {label: 'Skills', link: '/skills'},
    // {label: 'Education', link: '/education'},
    // {label: 'Experience', link: '/experience'},
    // {label: 'Certifications', link: '/certifications'},
  ];

  private auth = inject(AuthService);
  private socialLinksService = inject(SocialLinksService);
  private themeService = inject(ThemeService);

  isAuthenticated = this.auth.isAuthenticated;
  isAdmin = this.auth.isAdmin;
  user = this.auth.user;
  socialLinks = this.socialLinksService.getSocialLinks();
  currentTheme = this.themeService.currentTheme;

  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;

    // Prevent body scroll when menu is open
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
