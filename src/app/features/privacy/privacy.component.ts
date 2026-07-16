import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css'],
})
export class PrivacyComponent {
  readonly lastUpdated = new Date(2026, 6, 16); // 16 July 2026
  readonly contactEmail = 'alex.nelson.bryan@gmail.com';
}
