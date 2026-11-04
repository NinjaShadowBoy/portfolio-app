import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CONTACT_EMAIL } from '../../core/constants/contact';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css'],
})
export class PrivacyComponent {
  readonly lastUpdated = new Date(2026, 6, 16); // 16 July 2026
  readonly contactEmail = CONTACT_EMAIL;
}
