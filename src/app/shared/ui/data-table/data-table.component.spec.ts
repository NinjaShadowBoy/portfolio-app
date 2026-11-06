import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataTableComponent } from './data-table.component';
import { DataTableActionsDirective, DataTableCellDirective } from './data-table.directives';
import { DataTableColumn, dropIndex, filterRows, moveItem, sortRows } from './data-table.model';

interface Person {
  id: number;
  name: string;
  age: number | null;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Carol', age: 41 },
  { id: 2, name: 'alice', age: null },
  { id: 3, name: 'Bob', age: 9 },
];

const COLUMNS: DataTableColumn<Person>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'age', header: 'Age', sortable: true, align: 'end' },
];

describe('data table model', () => {
  const name = COLUMNS[0];
  const age = COLUMNS[1];

  it('sorts text ignoring case and numbers numerically', () => {
    expect(sortRows(PEOPLE, name, 'asc').map((p) => p.name)).toEqual(['alice', 'Bob', 'Carol']);
    expect(sortRows(PEOPLE, age, 'asc').map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('keeps empty values last in both directions', () => {
    expect(sortRows(PEOPLE, age, 'desc').map((p) => p.id)).toEqual([1, 3, 2]);
  });

  it('keeps equal values in their original order', () => {
    const rows = [
      { id: 1, name: 'x', age: 5 },
      { id: 2, name: 'y', age: 5 },
      { id: 3, name: 'z', age: 5 },
    ];
    expect(sortRows(rows, age, 'desc').map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('uses the column value function when there is one', () => {
    const byLength: DataTableColumn<Person> = { key: 'len', header: 'Len', value: (p) => p.name.length };
    expect(sortRows(PEOPLE, byLength, 'asc').map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('filters on searchable columns, ignoring case', () => {
    expect(filterRows(PEOPLE, COLUMNS, ' ALI ').map((p) => p.id)).toEqual([2]);
    expect(filterRows(PEOPLE, COLUMNS, '41').map((p) => p.id)).toEqual([1]);
    expect(filterRows(PEOPLE, [{ ...age }, { ...name, searchable: false }], 'bob')).toEqual([]);
    expect(filterRows(PEOPLE, COLUMNS, '')).toBe(PEOPLE);
  });

  it('moves an item without changing the input', () => {
    const input = [1, 2, 3, 4];
    expect(moveItem(input, 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem(input, 3, 0)).toEqual([4, 1, 2, 3]);
    expect(moveItem(input, 1, 99)).toEqual([1, 3, 4, 2]);
    expect(moveItem(input, 9, 0)).toEqual([1, 2, 3, 4]);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it('turns a drop on the top or bottom half of a row into a final index', () => {
    expect(dropIndex(0, 2, false)).toBe(1);
    expect(dropIndex(0, 2, true)).toBe(2);
    expect(dropIndex(3, 1, false)).toBe(1);
    expect(dropIndex(3, 1, true)).toBe(2);
    expect(dropIndex(2, 2, true)).toBe(2);
    expect(dropIndex(2, 2, false)).toBe(2);
  });
});

@Component({
  imports: [DataTableComponent, DataTableCellDirective, DataTableActionsDirective],
  template: `
    <app-data-table
      [rows]="rows()"
      [columns]="columns"
      [loading]="loading()"
      [filterable]="true"
      [reorderable]="reorderable()"
      [rowKey]="rowKey"
      rowHeaderKey="name"
      label="People"
      (rowsReordered)="rows.set($any($event))"
    >
      <ng-template appDataTableCell="age" let-person>
        <b class="age">{{ person.age }} yrs</b>
      </ng-template>
      <ng-template appDataTableActions let-person>
        <button type="button" class="act" (click)="picked = person.id">Pick {{ person.name }}</button>
      </ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  readonly rows = signal<Person[]>(PEOPLE);
  readonly loading = signal(false);
  readonly reorderable = signal(false);
  readonly columns = COLUMNS;
  readonly rowKey = (person: Person) => person.id;
  picked: number | null = null;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  const names = () =>
    Array.from(el.querySelectorAll('tbody tr[data-row] th[scope="row"]')).map((cell) =>
      cell.textContent?.trim(),
    );
  const header = (label: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('thead th')).find((th) => th.textContent?.includes(label))!;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const click = async (target: Element | null) => {
    (target as HTMLElement).click();
    await settle();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    await settle();
  });

  it('renders column headers with scope, a row header column and custom cells', () => {
    expect(el.querySelector('table')?.getAttribute('aria-label')).toBe('People');
    const headers = Array.from(el.querySelectorAll('thead th'));
    expect(headers.map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
    expect(names()).toEqual(['Carol', 'alice', 'Bob']);
    expect(el.querySelectorAll('.age')[0].textContent).toBe('41 yrs');
    expect(el.querySelectorAll('td[data-label="Age"]').length).toBe(3);
    expect(el.querySelectorAll('.act').length).toBe(3);
  });

  it('cycles a column through ascending, descending and the original order', async () => {
    const button = () => header('Name').querySelector('button')!;
    expect(header('Name').getAttribute('aria-sort')).toBe('none');

    await click(button());
    expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['alice', 'Bob', 'Carol']);

    await click(button());
    expect(header('Name').getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['Carol', 'Bob', 'alice']);

    await click(button());
    expect(header('Name').getAttribute('aria-sort')).toBe('none');
    expect(names()).toEqual(['Carol', 'alice', 'Bob']);
  });

  it('marks only the sorted column and does not sort columns that are not sortable', async () => {
    await click(header('Age').querySelector('button'));
    expect(header('Age').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Name').getAttribute('aria-sort')).toBe('none');
    expect(el.querySelector('thead th:last-child')?.getAttribute('aria-sort')).toBeNull();
  });

  it('filters rows and shows a message when none match', async () => {
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'bo';
    input.dispatchEvent(new Event('input'));
    await settle();
    expect(names()).toEqual(['Bob']);

    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await settle();
    expect(names()).toEqual([]);
    expect(el.querySelector('.dt-state')?.textContent).toContain('No rows match the filter.');
  });

  it('shows the empty and loading states', async () => {
    host.rows.set([]);
    await settle();
    expect(el.querySelector('.dt-state')?.textContent).toContain('Nothing to show.');
    expect(el.querySelector('input[type="search"]')).toBeNull();

    host.loading.set(true);
    await settle();
    expect(el.querySelector('.dt-state')?.textContent).toContain('Loading...');
    expect(el.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
  });

  it('keeps rows visible but dimmed while loading', async () => {
    host.loading.set(true);
    await settle();
    expect(names().length).toBe(3);
    expect(el.querySelector('.dt-scroll')?.classList).toContain('is-loading');
  });

  describe('in reorder mode', () => {
    beforeEach(async () => {
      host.reorderable.set(true);
      await settle();
    });

    it('drops sorting and filtering', () => {
      expect(el.querySelector('thead button')).toBeNull();
      expect(el.querySelector('thead th[aria-sort]')).toBeNull();
      expect(el.querySelector('input[type="search"]')).toBeNull();
    });

    it('disables the first up button and the last down button', () => {
      const rows = el.querySelectorAll('tbody tr[data-row]');
      expect(rows[0].querySelector<HTMLButtonElement>('[data-move="up"]')!.disabled).toBe(true);
      expect(rows[2].querySelector<HTMLButtonElement>('[data-move="down"]')!.disabled).toBe(true);
      expect(rows[1].querySelector<HTMLButtonElement>('[data-move="down"]')!.disabled).toBe(false);
    });

    it('emits the new order from the move buttons and announces it', async () => {
      await click(el.querySelectorAll('tbody tr[data-row]')[2].querySelector('[data-move="up"]'));

      expect(host.rows().map((p) => p.id)).toEqual([1, 3, 2]);
      expect(names()).toEqual(['Carol', 'Bob', 'alice']);
      expect(el.querySelector('[role="status"]')?.textContent).toContain('Bob moved to position 2 of 3');
    });

    it('labels the move buttons with the row name', () => {
      const label = el.querySelector('tbody tr[data-row] [data-move="down"]')!.getAttribute('aria-label');
      expect(label).toBe('Move Carol down');
    });

    it('reorders by dragging a row onto the lower half of another', async () => {
      const rows = Array.from(el.querySelectorAll<HTMLElement>('tbody tr[data-row]'));
      rows.forEach((row) => {
        row.getBoundingClientRect = () => ({ top: 0, height: 100 }) as DOMRect;
      });
      const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' };
      const fire = (target: Element, type: string, clientY = 0) => {
        const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
        Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
        Object.defineProperty(event, 'clientY', { value: clientY });
        target.dispatchEvent(event);
      };

      fire(rows[0].querySelector('.dt-handle')!, 'dragstart');
      fire(rows[2], 'dragover', 80);
      await settle();
      expect(rows[2].classList).toContain('drop-after');
      fire(rows[2], 'drop');
      await settle();

      expect(host.rows().map((p) => p.id)).toEqual([2, 3, 1]);
      expect(el.querySelector('.drop-after, .drop-before, .dragging')).toBeNull();
    });
  });
});
