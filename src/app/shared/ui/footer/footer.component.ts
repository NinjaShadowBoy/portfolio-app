import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SocialLinksService } from '../../../core/services/social-links.service';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../../../core/constants/contact';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly socialLinks = inject(SocialLinksService).getSocialLinks();

  readonly quickLinks = [
    { name: $localize`:Footer home link@@footerHome:Home`, route: '/home' },
    { name: $localize`:Footer projects link@@footerProjects:Projects`, route: '/projects' },
    { name: $localize`:Footer about link@@footerAbout:About`, route: '/about' },
    { name: $localize`:Footer contact link@@footerContact:Contact`, route: '/contact' },
  ];

  readonly contactInfo = { email: CONTACT_EMAIL, phone: CONTACT_PHONE };
}
