import { Mocked } from 'vitest';
import { createSpyObj } from '../../../../../testing/create-spy-obj';
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
  let admin: Mocked<AdminService>;

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
    admin = createSpyObj<AdminService>(['listUsers', 'updateUserRole', 'deleteUser']);
    admin.listUsers.mockReturnValue(
      of({ items: [user(1, { role: 'ADMIN', provider: 'LOCAL' }), user(8)], total: 2, limit: 25, offset: 0 }),
    );
    admin.updateUserRole.mockReturnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [UsersPanelComponent],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: AuthService, useValue: { user: signal({ id: 1, name: 'Me', email: 'me@x.y' }) } },
        { provide: NotificationService, useValue: createSpyObj(['success', 'error']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UsersPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('offers no role or delete actions on the signed-in admin', () => {
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tbody tr[data-row]'));
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.row-actions')).toBeNull();
    expect(rows[1].textContent).toContain('Make admin');
  });

  it('shows each user in a table row with the account details', () => {
    const table: HTMLElement = fixture.nativeElement.querySelector('table');
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['User', 'Sign-in', 'Joined', 'Last login', 'Comments', 'Ratings', 'Actions']);

    const first = table.querySelector('tbody tr[data-row]')!;
    expect(first.querySelector('th[scope="row"]')?.textContent).toContain('User 1');
    expect(first.querySelector('th[scope="row"]')?.textContent).toContain('You');
    expect(first.querySelector('td[data-label="Last login"]')?.textContent).toContain('never');
  });

  it('keeps the server order, since sorting one page of a paged list would mislead', () => {
    expect(fixture.nativeElement.querySelector('thead button')).toBeNull();
  });

  it('shows the empty message and a way back on an empty later page', async () => {
    admin.listUsers.mockReturnValue(of({ items: [], total: 30, limit: 25, offset: 25 }));
    component.nextPage();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dt-state')?.textContent).toContain('No users match.');
    expect(fixture.nativeElement.querySelector('.pager')?.textContent).toContain('Previous');
  });

  it('updates the row in place after a role change', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

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

    expect(admin.listUsers).toHaveBeenCalledWith(expect.objectContaining({ search: 'ann', offset: 0 }));
  });
});
