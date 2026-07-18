import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { IdentityService } from '../../core/services/identity.service';
import { ProfileService } from '../../core/services/profile.service';
import { PhotoService } from '../../core/services/photo.service';
import { CommentService, CommentDto } from '../../core/services/comment.service';
import { ProjectDataService } from '../../core/services/project-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, UserAvatarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent {
  private authService = inject(AuthService);
  identityService = inject(IdentityService); // public for template
  private profileService = inject(ProfileService);
  private photoService = inject(PhotoService);
  private commentService = inject(CommentService);
  private projectService = inject(ProjectDataService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly user = this.authService.user;

  name = signal('');
  currentPassword = signal('');
  newPassword = signal('');
  isSavingProfile = signal(false);
  isSavingPassword = signal(false);
  isUploadingAvatar = signal(false);

  myComments = signal<CommentDto[]>([]);

  private readonly initEffect = effect(() => {
    const current = this.user();
    if (current) {
      this.name.set(current.name);
    }
  });

  constructor() {
    this.loadActivity();
  }

  private loadActivity() {
    this.commentService
      .getMyComments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => this.myComments.set(comments),
        error: (err) => console.error('Error loading comments:', err),
      });
  }

  projectName(projectId: number): string {
    return this.projectService.getProject(projectId)?.name ?? `#${projectId}`;
  }

  saveProfile() {
    const name = this.name().trim();
    if (!name || this.isSavingProfile()) return;

    this.isSavingProfile.set(true);
    this.profileService
      .updateProfile({ name })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingProfile.set(false))
      )
      .subscribe({
        next: (updated) => {
          this.authService.updateUser({ name: updated.name });
          this.identityService.refresh();
          this.notificationService.success($localize`:@@profileUpdated:Profile updated`);
        },
        error: () => this.notificationService.error($localize`:@@profileUpdateFailed:Failed to update profile`),
      });
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.isUploadingAvatar()) return;

    this.isUploadingAvatar.set(true);
    this.photoService
      .uploadProfilePhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (photo) => {
          this.profileService
            .updateProfile({ imageUrl: photo.photoUrl })
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              finalize(() => this.isUploadingAvatar.set(false))
            )
            .subscribe({
              next: () => {
                this.identityService.refresh();
                this.notificationService.success($localize`:@@profileAvatarUpdated:Profile photo updated`);
              },
              error: () => this.notificationService.error($localize`:@@profileUpdateFailed:Failed to update profile`),
            });
        },
        error: () => {
          this.isUploadingAvatar.set(false);
          this.notificationService.error($localize`:@@profileAvatarFailed:Failed to upload photo`);
        },
      });
  }

  changePassword() {
    const currentPassword = this.currentPassword();
    const newPassword = this.newPassword();
    if (this.isSavingPassword()) return;
    if (newPassword.length < 8) {
      this.notificationService.warning($localize`:@@profilePasswordTooShort:New password must be at least 8 characters`);
      return;
    }

    this.isSavingPassword.set(true);
    this.profileService
      .changePassword({ currentPassword, newPassword })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSavingPassword.set(false))
      )
      .subscribe({
        next: () => {
          this.currentPassword.set('');
          this.newPassword.set('');
          this.notificationService.success($localize`:@@profilePasswordChanged:Password changed`);
        },
        error: () => this.notificationService.error($localize`:@@profilePasswordFailed:Failed to change password. Check your current password.`),
      });
  }

  deleteComment(comment: CommentDto) {
    if (!confirm($localize`:@@commentDeleteConfirm:Are you sure you want to delete this comment?`)) return;
    this.commentService
      .deleteComment(comment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.myComments.update((list) => list.filter((c) => c.id !== comment.id)),
        error: () => this.notificationService.error($localize`:@@commentDeleteFailed:Failed to delete comment`),
      });
  }

  deleteAccount() {
    if (!confirm($localize`:@@profileDeleteConfirm:Permanently delete your account and all your comments? This cannot be undone.`)) return;
    this.profileService
      .deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success($localize`:@@profileDeleted:Account deleted`);
          this.authService.logout();
          this.identityService.refresh();
          this.router.navigate(['/home']);
        },
        error: () => this.notificationService.error($localize`:@@profileDeleteFailed:Failed to delete account`),
      });
  }
}
