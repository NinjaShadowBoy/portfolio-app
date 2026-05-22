import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  notificationService.error('Please log in to continue.');
  return router.createUrlTree(['/login']);
};

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

export const contactGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component: CanComponentDeactivate
) => component.canDeactivate();
