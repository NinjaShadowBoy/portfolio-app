import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const auth = inject(AuthService);

  const isAuthenticated = auth.isAuthenticated();
  if (isAuthenticated) return true;

  notificationService.error('Please log in to continue.');
  return router.createUrlTree(['/login']);
};

// Consider using this interface for all CanDeactivate guards,
// and have your components implement this interface, too.
//
//   e.g. export class VillainsComponent implements CanComponentDeactivate { ...
//
export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

// export const NameGuard: CanDeactivateFn<CanComponentDeactivate> = (
//   component: CanComponentDeactivate
// ) => {
//     if (component.canDeactivate()) {
//       console.log(`💂‍♀️ [Guard] - Can Deactivate Guard - allowed`);
//       return true;
//     } else {
//       console.log(`💂‍♀️ [Guard] - Can Deactivate Guard - not allowed`);
//       return false;
//   }
// }

export const contactGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component: CanComponentDeactivate
) => component.canDeactivate();
