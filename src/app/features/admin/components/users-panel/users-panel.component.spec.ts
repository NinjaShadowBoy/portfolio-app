import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { UsersPanelComponent } from './users-panel.component';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AdminUser } from '../../../../core/interfaces/admin.interface';

describe('UsersPanelComponent', () => {
  let fixture: ComponentFixture<UsersPanelComponent>;
  let component: UsersPanelComponent;
  let admin: jasmine.SpyObj<AdminService>;

  const user = (id: number, extra: Partial<AdminUser> = {}): AdminUser => ({
    id,
    email: `u${id}@example.com`,
    name: `User ${id}`,
    role: 'USER',
    provider: 'GITHUB',
    imageUrl: null,
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: null,
    commentCount: 0,
    ratingCount: 0,
    ...extra,
  });

  beforeEach(async () => {
    admin = jasmine.createSpyObj<AdminService>('AdminService', ['listUsers', 'updateUserRole', 'deleteUser']);
    admin.listUsers.and.returnValue(
      of({ items: [user(1, { role: 'ADMIN', provider: 'LOCAL' }), user(8)], total: 2, limit: 25, offset: 0 }),
    );
    admin.updateUserRole.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [UsersPanelComponent],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: AuthService, useValue: { user: signal({ id: 1, name: 'Me', email: 'me@x.y' }) } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UsersPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('offers no role or delete actions on the signed-in admin', () => {
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.panel-item'));
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.panel-item-actions')).toBeNull();
    expect(rows[1].textContent).toContain('Make admin');
  });

  it('updates the row in place after a role change', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.setRole(component.page()!.items[1], 'ADMIN');

    expect(admin.updateUserRole).toHaveBeenCalledWith(8, 'ADMIN');
    expect(component.page()!.items[1].role).toBe('ADMIN');
  });

  it('resets to the first page when the search changes', async () => {
    component.nextPage();
    component.searchInput.set('  ann ');
    component.applySearch();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(admin.listUsers).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'ann', offset: 0 }));
  });
});
