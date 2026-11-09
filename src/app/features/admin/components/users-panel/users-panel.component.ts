import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { DEFERRED_DELETE_MS } from '../../../../core/utils/deferred-action';
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
  private confirm = inject(ConfirmService);

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
  /** Loaded, and nothing to list. */
  readonly empty = computed(() => this.page()?.total === 0 && !this.isLoading());
  readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

  applySearch(event?: Event) {
    event?.preventDefault();
    this.offset.set(0);
    this.search.set(this.searchInput().trim());
  }

  clearSearch() {
    this.searchInput.set('');
    this.applySearch();
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

  /**
   * Applies the change in the table at once, then sends it. The toast offers
   * Undo, which sends the inverse change. A failed request puts the row back.
   */
  setRole(user: AdminUser, role: UserRole, offerUndo = true) {
    const previous = user.role;
    if (previous === role) return;

    this.patchRole(user.id, role);
    this.busyId.set(user.id);
    const toastId = offerUndo
      ? this.notification.show({
          type: 'success',
          message: `${user.name} is now ${role === 'ADMIN' ? 'an admin' : 'a regular user'}. It takes effect at their next login.`,
          duration: DEFERRED_DELETE_MS,
          actions: [{ label: 'Undo', action: () => this.setRole({ ...user, role }, previous, false) }],
        })
      : null;

    this.admin.updateUserRole(user.id, role).subscribe({
      next: () => this.busyId.set(null),
      error: (err) => {
        if (toastId) this.notification.dismiss(toastId);
        this.patchRole(user.id, previous);
        this.fail('Could not change the role', err);
      },
    });
  }

  /** Irreversible, and it cascades to the user's feedback, so it asks first. */
  async deleteUser(user: AdminUser) {
    const who = user.provider === 'ANON' ? 'this anonymous identity' : `${user.name} (${user.email})`;
    const confirmed = await this.confirm.ask({
      title: `Delete ${user.provider === 'ANON' ? 'this anonymous identity' : user.name}?`,
      body:
        `Deleting ${who} also deletes their ${plural(user.commentCount, 'comment')} and ` +
        `${plural(user.ratingCount, 'rating')}. This cannot be undone.`,
      confirmLabel: 'Delete user',
      tone: 'danger',
    });
    if (!confirmed) return;

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

  private patchRole(id: number, role: UserRole) {
    this.patchPage((items) => items.map((item) => (item.id === id ? { ...item, role } : item)));
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

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
