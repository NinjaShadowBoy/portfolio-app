
import { Component, inject, LOCALE_ID } from '@angular/core';
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

  contactInfo = {
    email: 'alex.nelson.bryan@gmail.com',
    phone: '+237 656 246 826',
  };
}
