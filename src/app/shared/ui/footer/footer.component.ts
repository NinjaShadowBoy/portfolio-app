import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SocialLinksService } from '../../../core/services/social-links.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  socialLinks = new SocialLinksService().getSocialLinks();

  quickLinks = [
    { name: $localize`:Footer home link@@footerHome:Home`, route: '/home' },
    { name: $localize`:Footer projects link@@footerProjects:Projects`, route: '/projects' },
    { name: $localize`:Footer about link@@footerAbout:About`, route: '/about' },
    { name: $localize`:Footer contact link@@footerContact:Contact`, route: '/contact' },
  ];

  contactInfo = {
    email: 'alex.nelson.bryan@gmail.com',
    phone: '+237 656 246 826',
  };
}
