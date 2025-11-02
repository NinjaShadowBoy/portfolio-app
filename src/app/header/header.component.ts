import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SocialLinksService } from '../services/social-links.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  title: string = 'Alex Nelson AKA NinjaShadowboy';
  subtitle: string = 'Junior Software Engineer and Student';
  description: string =
    'I am a software engineer with a passion for building web applications and mobile applications.';

  navItems: { label: string; link: string }[] = [
    { label: 'Home', link: '/home' },
    { label: 'MyWork', link: '/projects' },
    { label: 'MySkills', link: '/about' },
    { label: 'Get In touch', link: '/contact' },
    // {label: 'Blog', link: '/blog'},
    // {label: 'Resume', link: '/resume'},
    // {label: 'Skills', link: '/skills'},
    // {label: 'Education', link: '/education'},
    // {label: 'Experience', link: '/experience'},
    // {label: 'Certifications', link: '/certifications'},
  ];

  private auth = inject(AuthService);
  private socialLinksService = inject(SocialLinksService);

  isAuthenticated = this.auth.isAuthenticated;
  isAdmin = this.auth.isAdmin;
  socialLinks = this.socialLinksService.getSocialLinks();

  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout() {
    this.auth.logout();
  }
}
