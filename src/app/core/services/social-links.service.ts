
import { Injectable } from '@angular/core';

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
      name: $localize`:@@socialLinkedIn:LinkedIn`,
      url: 'https://www.linkedin.com/in/alex-nelson-ryan-abena-439068290/',
      icon: 'assets/images/LinkedIn.png',
      ariaLabel: $localize`:@@socialLinkedInLabel:Visit LinkedIn profile`,
    },
    {
      name: $localize`:@@socialGitHub:GitHub`,
      url: 'https://github.com/NinjaShadowBoy/NinjaShadowBoy',
      icon: 'assets/images/GitHub.png',
      ariaLabel: $localize`:@@socialGitHubLabel:Visit GitHub profile`,
    },
    {
      name: $localize`:@@socialWhatsApp:WhatsApp`,
      url: 'https://wa.me/237656246826',
      icon: 'assets/images/WhatsApp.svg',
      ariaLabel: $localize`:@@socialWhatsAppLabel:Chat on WhatsApp`,
    },
  ];

  getSocialLinks(): SocialLink[] {
    return this.links;
  }
}
