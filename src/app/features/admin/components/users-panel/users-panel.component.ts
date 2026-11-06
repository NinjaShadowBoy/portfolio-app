import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AdminUser, Page } from '../../../../core/interfaces/admin.interface';
import { UserRole } from '../../../../core/interfaces/auth.interface';
import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { DataTableActionsDirective, DataTableCellDirective } from '../../../../shared/ui/data-table/data-table.directives';
import { DataTableColumn } from '../../../../shared/ui/data-table/data-table.model';

const PAGE_SIZE = 25;

/** Not sortable: the list is paged by the server, so a client sort would only reorder one page. */
const USER_COLUMNS: DataTableColumn<AdminUser>[] = [
  { key: 'name', header: 'User' },
  { key: 'provider', header: 'Sign-in' },
  { key: 'createdAt', header: 'Joined' },
  { key: 'lastLoginAt', header: 'Last login' },
  { key: 'commentCount', header: 'Comments', align: 'end' },
  { key: 'ratingCount', header: 'Ratings', align: 'end' },
];

@Component({
  selector: 'app-users-panel',
  imports: [DatePipe, DataTableComponent, DataTableCellDirective, DataTableActionsDirective],
  templateUrl: './users-panel.component.html',
  styleUrl: '../../admin-shared.css',
})
export class UsersPanelComponent {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  /** The search box text; applied on submit so typing does not fire a request per key. */
  readonly searchInput = signal('');
  readonly search = signal('');
  readonly includeAnonymous = signal(false);
  readonly offset = signal(0);
  readonly busyId = signal<number | null>(null);
  readonly pageSize = PAGE_SIZE;

  private usersResource = rxResource({
    params: () => ({
      search: this.search(),
      includeAnonymous: this.includeAnonymous(),
      offset: this.offset(),
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.admin.listUsers(params),
  });

  readonly page = computed<Page<AdminUser> | null>(() =>
    this.usersResource.hasValue() ? this.usersResource.value() : null,
  );
  readonly users = computed(() => this.page()?.items ?? []);
  readonly columns = USER_COLUMNS;
  readonly rowKey = (user: AdminUser) => user.id;
  readonly isLoading = this.usersResource.isLoading;
  readonly failed = computed(() => this.usersResource.status() === 'error');
  readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

  applySearch(event?: Event) {
    event?.preventDefault();
    this.offset.set(0);
    this.search.set(this.searchInput().trim());
  }

  toggleAnonymous(checked: boolean) {
    this.offset.set(0);
    this.includeAnonymous.set(checked);
  }

  previousPage() {
    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
  }

  nextPage() {
    this.offset.update((offset) => offset + PAGE_SIZE);
  }

  /** Admins cannot edit themselves here, and anonymous identities have no account to manage. */
  canManage(user: AdminUser): boolean {
    return user.id !== this.currentUserId() && user.provider !== 'ANON';
  }

  setRole(user: AdminUser, role: UserRole) {
    const action = role === 'ADMIN' ? 'Grant admin access to' : 'Remove admin access from';
    if (!confirm(`${action} ${user.name} (${user.email})? It takes effect at their next login.`)) return;

    this.busyId.set(user.id);
    this.admin.updateUserRole(user.id, role).subscribe({
      next: () => {
        this.patchPage((items) => items.map((item) => (item.id === user.id ? { ...item, role } : item)));
        this.notification.success(`${user.name} is now ${role === 'ADMIN' ? 'an admin' : 'a regular user'}.`);
        this.busyId.set(null);
      },
      error: (err) => this.fail('Could not change the role', err),
    });
  }

  deleteUser(user: AdminUser) {
    const activity = `${user.commentCount} comment(s) and ${user.ratingCount} rating(s)`;
    if (!confirm(`Delete ${user.name} (${user.email})? Their ${activity} are deleted too. This cannot be undone.`)) {
      return;
    }

    this.busyId.set(user.id);
    this.admin.deleteUser(user.id).subscribe({
      next: () => {
        this.notification.success(`Deleted ${user.name}.`);
        this.busyId.set(null);
        // Deleting the last row of a later page steps back instead of showing an empty page.
        if (this.page()?.items.length === 1 && this.offset() > 0) this.previousPage();
        else this.usersResource.reload();
      },
      error: (err) => this.fail('Could not delete the user', err),
    });
  }

  private patchPage(change: (items: AdminUser[]) => AdminUser[]) {
    const page = this.page();
    if (page) this.usersResource.set({ ...page, items: change(page.items) });
  }

  private fail(message: string, err: unknown) {
    console.error(message, err);
    const detail = (err as { error?: { message?: string } })?.error?.message;
    this.notification.error(detail ? `${message}: ${detail}` : `${message}.`);
    this.busyId.set(null);
  }
}
