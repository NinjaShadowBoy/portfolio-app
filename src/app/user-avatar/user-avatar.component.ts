import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css'],
})
export class UserAvatarComponent {
  @Input() userName: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() title: string = '';

  get initials(): string {
    if (!this.userName) return '';
    return this.userName.charAt(0).toUpperCase();
  }
}
