import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css'],
})
export class UserAvatarComponent {
  userName = input<string>('');
  size = input<'small' | 'medium' | 'large'>('medium');
  title = input<string>('');

  get initials(): string {
    if (!this.userName()) return '';
    return this.userName().charAt(0).toUpperCase();
  }
}
