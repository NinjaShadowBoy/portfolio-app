/** A plain value a column can show, sort and filter on. */
export type DataTableValue = string | number | boolean | Date | readonly string[] | null | undefined;

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  /** Stable id. Also the property read from the row when `value` is not set. */
  key: string;
  /** Header text, already localized. Cards on narrow screens use it as the field label. */
  header: string;
  /** Lets the user sort by this column. Needs a `value` or a row property named `key`. */
  sortable?: boolean;
  /** CSS width of the column on wide screens, for example `8rem`. */
  width?: string;
  /** Text alignment of the header and cells. Defaults to `start`. */
  align?: 'start' | 'center' | 'end';
  /** Reads the plain value used for default rendering, sorting and filtering. */
  value?: (row: T) => DataTableValue;
  /** Set to `false` to leave the column out of the text filter. */
  searchable?: boolean;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function cellValue<T>(row: T, column: DataTableColumn<T>): DataTableValue {
  return column.value ? column.value(row) : (row as unknown as Record<string, DataTableValue>)[column.key];
}

export function cellText(value: DataTableValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** Reduces a value to something comparable. Empty values become null and sort last. */
function sortKeyOf(value: DataTableValue): number | string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === 'boolean') return Number(value);
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  return cellText(value);
}

/** Returns a sorted copy. Empty values stay last in both directions; equal values keep their order. */
export function sortRows<T>(
  rows: readonly T[],
  column: DataTableColumn<T>,
  direction: SortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return rows
    .map((row) => ({ row, key: sortKeyOf(cellValue(row, column)) }))
    .sort((a, b) => {
      if (a.key === null || b.key === null) return Number(a.key === null) - Number(b.key === null);
      if (typeof a.key === 'number' && typeof b.key === 'number') return sign * (a.key - b.key);
      return sign * collator.compare(String(a.key), String(b.key));
    })
    .map((entry) => entry.row);
}

/** Keeps the rows whose searchable columns (or `filterBy` text) contain the term, ignoring case. */
export function filterRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  term: string,
  filterBy?: ((row: T) => string) | null,
): readonly T[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return rows;
  const searchable = columns.filter((column) => column.searchable !== false);
  return rows.filter((row) => {
    const haystack = filterBy
      ? filterBy(row)
      : searchable.map((column) => cellText(cellValue(row, column))).join(' ');
    return haystack.toLowerCase().includes(needle);
  });
}

/** Returns a copy with the item at `from` moved to index `to` (clamped to the list). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= result.length) return result;
  const target = Math.min(Math.max(to, 0), result.length - 1);
  const [item] = result.splice(from, 1);
  result.splice(target, 0, item);
  return result;
}

/**
 * Final index of a dragged row dropped on the upper or lower half of the row at `over`.
 * `from` is the dragged row's index before the move.
 */
export function dropIndex(from: number, over: number, placeAfter: boolean): number {
  const insertAt = over + (placeAfter ? 1 : 0);
  return insertAt > from ? insertAt - 1 : insertAt;
}
