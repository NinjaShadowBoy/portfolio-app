import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  // Social media links
  socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com',
      icon: 'github',
      ariaLabel: 'Visit GitHub profile',
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com',
      icon: 'linkedin',
      ariaLabel: 'Visit LinkedIn profile',
    },
    {
      name: 'Facebook',
      url: 'https://facebook.com',
      icon: 'facebook',
      ariaLabel: 'Visit Facebook profile',
    },
  ];

  // Quick links
  quickLinks = [
    { name: 'Home', route: '/home' },
    { name: 'Projects', route: '/projects' },
    { name: 'About', route: '/about' },
    { name: 'Contact', route: '/contact' },
  ];

  // Contact info
  contactInfo = {
    email: 'alex.nelson.bryan@gmail.com',
    phone: '+237 656 246 826',
    location: 'Yaounde, Cameroon',
  };
}
