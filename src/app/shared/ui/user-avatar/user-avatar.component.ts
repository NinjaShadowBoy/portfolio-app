import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrl: './user-avatar.component.css',
})
export class UserAvatarComponent {
  userName = input('');
  imageUrl = input<string | null>(null);
  size = input<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  title = input('');

  readonly initials = computed(() => this.userName().charAt(0).toUpperCase());
}
