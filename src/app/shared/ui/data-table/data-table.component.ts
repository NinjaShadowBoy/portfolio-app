import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DataTableActionsDirective, DataTableCellDirective } from './data-table.directives';
import {
  DataTableColumn,
  SortDirection,
  cellText,
  cellValue,
  dropIndex,
  filterRows,
  moveItem,
  sortRows,
} from './data-table.model';

/**
 * Generic table: client-side sorting and text filter, custom cells, a row
 * actions column, empty and loading states, a sticky header, and an optional
 * reorder mode (drag and drop plus move up/down buttons).
 *
 * Below 40rem of its own width the rows become stacked cards that carry the
 * column headers as field labels, so the page never scrolls sideways. The
 * table sizes itself from its container, not the viewport.
 *
 * Custom cells and actions come from `ng-template` children:
 * `<ng-template appDataTableCell="name" let-row>...</ng-template>` and
 * `<ng-template appDataTableActions let-row>...</ng-template>`.
 *
 * In reorder mode the table does not sort or filter and never changes `rows`
 * itself. It emits the new order through `rowsReordered`; the parent keeps the
 * order and passes it back in.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--dt-max-height]': 'maxHeight() ?? "none"',
    '[class.stackable]': 'stackOnNarrow()',
  },
})
export class DataTableComponent<T> {
  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly DataTableColumn<T>[]>();
  /** Accessible name of the table. */
  readonly label = input('');
  /** Identity used to track rows. Defaults to the row object. */
  readonly rowKey = input<(row: T) => unknown>((row) => row);
  /** Key of the column whose cell is the row header (`th scope="row"`). */
  readonly rowHeaderKey = input<string | null>(null);
  /** Marks rows that need attention, for example unread messages. */
  readonly highlightRow = input<((row: T) => boolean) | null>(null);

  readonly loading = input(false);
  readonly emptyText = input($localize`:@@dataTableEmpty:Nothing to show.`);
  readonly noMatchText = input($localize`:@@dataTableNoMatch:No rows match the filter.`);
  readonly loadingText = input($localize`:@@dataTableLoading:Loading...`);
  /** Text shown in a cell whose value is empty. */
  readonly emptyCell = input('-');

  readonly filterable = input(false);
  readonly filterLabel = input($localize`:@@dataTableFilterLabel:Filter rows`);
  readonly filterPlaceholder = input($localize`:@@dataTableFilterPlaceholder:Filter`);
  /** Replaces the per-column text that the filter searches. */
  readonly filterBy = input<((row: T) => string) | null>(null);

  readonly actionsLabel = input($localize`:@@dataTableActions:Actions`);
  /** CSS width of the actions column on wide screens. */
  readonly actionsWidth = input<string | null>(null);

  /** Stack rows as cards on narrow containers. */
  readonly stackOnNarrow = input(true);
  /** Height at which the body scrolls and the header stays in view. `null` never scrolls. */
  readonly maxHeight = input<string | null>('70vh');

  readonly sortKey = model<string | null>(null);
  readonly sortDirection = model<SortDirection>('asc');

  /** Reorder mode: drag handles and move buttons replace sorting and filtering. */
  readonly reorderable = input(false);
  /** Names a row in reorder labels and announcements. */
  readonly rowLabel = input<(row: T) => string>((row) => cellText(cellValue(row, this.columns()[0])));
  readonly rowsReordered = output<readonly T[]>();

  private cellDirectives = contentChildren(DataTableCellDirective);
  private actionsDirective = contentChild(DataTableActionsDirective);

  protected readonly filterText = signal('');
  protected readonly dragFrom = signal<number | null>(null);
  protected readonly dropTarget = signal<{ index: number; after: boolean } | null>(null);
  protected readonly announcement = signal('');

  protected readonly cellTemplates = computed(
    () => new Map(this.cellDirectives().map((directive) => [directive.columnKey(), directive.template])),
  );
  protected readonly actionsTemplate = computed(() => this.actionsDirective()?.template ?? null);
  protected readonly sortableColumns = computed(() => this.columns().filter((column) => column.sortable));
  protected readonly showFilter = computed(
    () => this.filterable() && !this.reorderable() && this.rows().length > 0,
  );
  protected readonly canSort =computed(() => !this.reorderable() && this.sortableColumns().length > 0);
  protected readonly columnCount = computed(
    () => this.columns().length + (this.actionsTemplate() ? 1 : 0) + (this.reorderable() ? 1 : 0),
  );

  protected readonly visibleRows = computed<readonly T[]>(() => {
    const rows = this.rows();
    if (this.reorderable()) return rows;
    const filtered = filterRows(rows, this.columns(), this.filterText(), this.filterBy());
    const column = this.sortableColumns().find((candidate) => candidate.key === this.sortKey());
    return column ? sortRows(filtered, column, this.sortDirection()) : filtered;
  });

  protected isActiveSort(column: DataTableColumn<T>): boolean {
    return !this.reorderable() && !!column.sortable && this.sortKey() === column.key;
  }

  protected ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (!this.canSort() || !column.sortable) return null;
    if (!this.isActiveSort(column)) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  /** Cycles a column through ascending, descending and the original order. */
  protected toggleSort(column: DataTableColumn<T>) {
    if (this.sortKey() !== column.key) {
      this.sortKey.set(column.key);
      this.sortDirection.set('asc');
    } else if (this.sortDirection() === 'asc') {
      this.sortDirection.set('desc');
    } else {
      this.sortKey.set(null);
      this.sortDirection.set('asc');
    }
  }

  protected setSortFromSelect(key: string) {
    this.sortKey.set(key || null);
    this.sortDirection.set('asc');
  }

  protected toggleDirection() {
    this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
  }

  protected dropPosition(index: number): 'before' | 'after' | null {
    const target = this.dropTarget();
    if (this.dragFrom() === null || target?.index !== index) return null;
    return target.after ? 'after' : 'before';
  }

  protected display(row: T, column: DataTableColumn<T>): string {
    return cellText(cellValue(row, column)) || this.emptyCell();
  }

  protected isRowHeader(column: DataTableColumn<T>): boolean {
    return this.rowHeaderKey() === column.key;
  }

  protected isHighlighted(row: T): boolean {
    return this.highlightRow()?.(row) ?? false;
  }

  protected setFilter(value: string) {
    this.filterText.set(value);
  }

  protected name(row: T): string {
    return this.rowLabel()(row);
  }

  protected moveUpLabel(row: T): string {
    const name = this.name(row);
    return $localize`:@@dataTableMoveUp:Move ${name}:name: up`;
  }

  protected moveDownLabel(row: T): string {
    const name = this.name(row);
    return $localize`:@@dataTableMoveDown:Move ${name}:name: down`;
  }

  protected dragLabel(row: T): string {
    const name = this.name(row);
    return $localize`:@@dataTableDrag:Drag ${name}:name: to reorder`;
  }

  /** Move buttons. `delta` is -1 for up and 1 for down. */
  protected moveBy(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= this.rows().length) return;
    this.commitMove(index, target);
    // The moved row re-renders in a new place and may lose focus; put it back.
    afterNextRender(
      () => {
        const row = this.rowElement(target);
        const preferred = delta < 0 ? 'up' : 'down';
        const button =
          row?.querySelector<HTMLButtonElement>(`button[data-move="${preferred}"]:not(:disabled)`) ??
          row?.querySelector<HTMLButtonElement>('button[data-move]:not(:disabled)');
        button?.focus();
      },
      { injector: this.injector },
    );
  }

  protected onDragStart(event: DragEvent, index: number, rowElement: HTMLElement) {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    // Firefox starts no drag without data.
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.setDragImage(rowElement, 16, 16);
    this.dragFrom.set(index);
  }

  protected onDragOver(event: DragEvent, index: number, rowElement: HTMLElement) {
    if (this.dragFrom() === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const bounds = rowElement.getBoundingClientRect();
    const after = event.clientY > bounds.top + bounds.height / 2;
    const current = this.dropTarget();
    if (current?.index !== index || current.after !== after) this.dropTarget.set({ index, after });
  }

  protected onDrop(event: DragEvent) {
    const from = this.dragFrom();
    const target = this.dropTarget();
    if (from === null) return;
    event.preventDefault();
    this.clearDrag();
    if (target === null) return;
    this.commitMove(from, dropIndex(from, target.index, target.after));
  }

  protected clearDrag() {
    this.dragFrom.set(null);
    this.dropTarget.set(null);
  }

  private commitMove(from: number, to: number) {
    if (from === to) return;
    const rows = this.rows();
    const moved = rows[from];
    this.rowsReordered.emit(moveItem(rows, from, to));
    const name = this.name(moved);
    const position = to + 1;
    const total = rows.length;
    this.announcement.set($localize`:@@dataTableMoved:${name}:name: moved to position ${position}:position: of ${total}:total:`);
  }

  private rowElement(index: number): HTMLElement | null {
    const rows = this.host.nativeElement.querySelectorAll<HTMLElement>('tbody tr[data-row]');
    return rows[index] ?? null;
  }
}
