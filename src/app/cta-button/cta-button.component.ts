import { Component, Input } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cta-button',
  standalone: true,
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  templateUrl: './cta-button.component.html',
  styleUrls: ['./cta-button.component.css'],
})
export class CtaButtonComponent {
  @Input() text: string = 'Learn More';
  @Input() routerLink?: string | any[];
  @Input() href?: string;
  @Input() icon: 'arrow-right' | 'external' | 'search' | 'explore' = 'arrow-right';
  @Input() variant: 'primary' | 'secondary' | 'outline' = 'outline';
  @Input() target?: string;
}
