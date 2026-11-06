import { Injectable } from '@angular/core';
import { CONTACT_PHONE } from '../constants/contact';

export interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocialLinksService {
  // Single source of truth for all social media links
  private readonly links: SocialLink[] = [
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/alex-nelson-ryan-abena-439068290/',
      icon: 'assets/images/LinkedIn.png',
      ariaLabel: $localize`:@@socialLinkedInLabel:Visit LinkedIn profile`,
    },
    {
      name: 'GitHub',
      url: 'https://github.com/NinjaShadowBoy/NinjaShadowBoy',
      icon: 'assets/images/GitHub.png',
      ariaLabel: $localize`:@@socialGitHubLabel:Visit GitHub profile`,
    },
    {
      name: 'WhatsApp',
      // Same number as the phone shown on the site; wa.me wants digits only.
      url: `https://wa.me/${CONTACT_PHONE.replace(/\D/g, '')}`,
      icon: 'assets/images/WhatsApp.svg',
      ariaLabel: $localize`:@@socialWhatsAppLabel:Chat on WhatsApp`,
    },
  ];

  getSocialLinks(): SocialLink[] {
    return this.links;
  }
}
