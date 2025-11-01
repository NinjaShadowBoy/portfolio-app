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
    {
      name: 'GitHub',
      url: 'https://github.com/NinjaShadowBoy/NinjaShadowBoy',
      icon: 'assets/images/GitHub.png',
      ariaLabel: 'Visit GitHub profile',
    },
  ];

  getSocialLinks(): SocialLink[] {
    return this.links;
  }
}
