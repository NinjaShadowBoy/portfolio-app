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
      url: 'https://github.com/NinjaShadowBoy/NinjaShadowBoy',
      icon: 'assets/images/GitHub.png',
      ariaLabel: 'Visit GitHub profile',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/alex-nelson-ryan-abena-439068290/',
      icon: 'assets/images/LinkedIn.png',
      ariaLabel: 'Visit LinkedIn profile',
    },
    {
      name: 'Facebook',
      url: 'https://facebook.com',
      icon: 'assets/images/Facebook Circled.png',
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
