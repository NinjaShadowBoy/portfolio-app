import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { REORDER_DRAG_THRESHOLD_PX, REORDER_GRID, ReorderEvent } from './reorder-grid.directives';

const ORIGINAL = ['A', 'B', 'C', 'D', 'E'] as const;

@Component({
  imports: [...REORDER_GRID],
  template: `
    <ul [appReorderGrid]="items()" #grid="appReorderGrid" (reordered)="onReorder($event)">
      @for (item of items(); track item; let i = $index) {
        <li [appReorderItem]="i" [reorderLabel]="'Tile ' + item" [attr.data-item]="item">
          <button type="button" class="handle" appReorderHandle>{{ item }}</button>
          <button type="button" class="later" [disabled]="i === items().length - 1" (click)="grid.move(i, i + 1)">later</button>
        </li>
      }
    </ul>
    <button type="button" class="outside">outside</button>
  `,
})
class HostComponent {
  readonly input: readonly string[] = ORIGINAL;
  readonly items = signal<readonly string[]>(this.input);
  readonly events: ReorderEvent<string>[] = [];

  onReorder(event: ReorderEvent<string>) {
    this.events.push(event);
    this.items.set(event.items);
  }
}

/** jsdom has no layout: tiles are 100x100 with a 10px gap, 3 per row, in DOM order. */
const COLUMNS = 3;
function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const tile = this.closest('li[data-item]');
    const index = tile ? Array.from(tile.parentElement!.querySelectorAll('li[data-item]')).indexOf(tile) : 0;
    const left = (index % COLUMNS) * 110;
    const top = Math.floor(index / COLUMNS) * 110;
    return { left, top, width: 100, height: 100, x: left, y: top, right: left + 100, bottom: top + 100 } as DOMRect;
  });
}

/** Tile centre, the way a user would grab and aim. */
const centre = (index: number) => ({ x: (index % COLUMNS) * 110 + 50, y: Math.floor(index / COLUMNS) * 110 + 50 });

function pointer(target: Element, type: string, point: { x: number; y: number }) {
  const Ctor = (window.PointerEvent ?? MouseEvent) as typeof MouseEvent;
  const event = new Ctor(type, { bubbles: true, cancelable: true, clientX: point.x, clientY: point.y, button: 0 });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
}

describe('Reorder grid directives', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const el = (): HTMLElement => fixture.nativeElement;
  const order = () => Array.from(el().querySelectorAll<HTMLElement>('li[data-item]')).map((li) => li.dataset['item']);
  const tile = (item: string) => el().querySelector<HTMLElement>(`li[data-item="${item}"]`)!;
  const handle = (item: string) => tile(item).querySelector<HTMLButtonElement>('.handle')!;
  const status = () => el().querySelector('.reorder-grid-status')?.textContent ?? '';
  const key = (target: HTMLElement, keyName: string) => {
    const event = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    stubLayout();
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('marks the handle for touch dragging', () => {
    expect(handle('A').style.touchAction).toBe('none');
    expect(handle('A').getAttribute('aria-pressed')).toBe('false');
  });

  describe('pointer', () => {
    it('drags a tile to the nearest tile centre in 2D and emits the new order', async () => {
      const a = handle('A');
      pointer(a, 'pointerdown', centre(0));
      pointer(a, 'pointermove', { x: 60, y: 50 });
      fixture.detectChanges();
      expect(tile('A').classList).toContain('reorder-item--dragging');
      expect(tile('A').style.transform).toBe('translate(10px, 0px)');

      // Over the second row, middle column: index 4.
      pointer(a, 'pointermove', { x: centre(4).x + 20, y: centre(4).y - 30 });
      fixture.detectChanges();
      expect(tile('E').dataset['reorderDrop']).toBe('after');

      pointer(a, 'pointerup', centre(4));
      await settle();

      expect(host.events).toEqual([{ items: ['B', 'C', 'D', 'E', 'A'], from: 0, to: 4 }]);
      expect(order()).toEqual(['B', 'C', 'D', 'E', 'A']);
      expect(tile('A').classList).not.toContain('reorder-item--dragging');
      expect(tile('A').style.transform).toBe('');
      expect(el().querySelector('[data-reorder-drop]')).toBeNull();
      expect(status()).toBe('Tile A moved to position 5 of 5');
      // The grid never touches its input.
      expect(host.input).toEqual(ORIGINAL);
    });

    it('shows the drop indicator before the target when dragging backwards', () => {
      const d = handle('D');
      pointer(d, 'pointerdown', centre(3));
      pointer(d, 'pointermove', centre(1));
      fixture.detectChanges();
      expect(tile('B').dataset['reorderDrop']).toBe('before');
    });

    it('treats a press without movement past the threshold as a click', () => {
      const a = handle('A');
      pointer(a, 'pointerdown', centre(0));
      pointer(a, 'pointermove', { x: 50 + REORDER_DRAG_THRESHOLD_PX - 1, y: 50 });
      pointer(a, 'pointerup', { x: 50 + REORDER_DRAG_THRESHOLD_PX - 1, y: 50 });
      expect(host.events).toEqual([]);
    });

    it('drops nothing when the pointer is cancelled or Escape is pressed', () => {
      const a = handle('A');
      pointer(a, 'pointerdown', centre(0));
      pointer(a, 'pointermove', centre(2));
      pointer(a, 'pointercancel', centre(2));
      fixture.detectChanges();
      expect(tile('A').classList).not.toContain('reorder-item--dragging');

      pointer(a, 'pointerdown', centre(0));
      pointer(a, 'pointermove', centre(2));
      key(a, 'Escape');
      pointer(a, 'pointerup', centre(2));
      expect(host.events).toEqual([]);
      expect(order()).toEqual([...ORIGINAL]);
    });
  });

  describe('keyboard', () => {
    it('picks up, moves left/right and up/down by row, then drops, keeping focus on the handle', async () => {
      const a = handle('A');
      a.focus();

      expect(key(a, ' ').defaultPrevented).toBe(true);
      await settle();
      expect(a.getAttribute('aria-pressed')).toBe('true');
      expect(tile('A').classList).toContain('reorder-item--grabbed');
      expect(status()).toContain('Tile A picked up at position 1 of 5');

      key(a, 'ArrowRight');
      await settle();
      expect(order()).toEqual(['B', 'A', 'C', 'D', 'E']);
      expect(status()).toBe('Tile A moved to position 2 of 5');
      expect(document.activeElement).toBe(a);

      key(a, 'ArrowDown');
      await settle();
      expect(order()).toEqual(['B', 'C', 'D', 'E', 'A']);
      expect(status()).toBe('Tile A moved to position 5 of 5');

      // No row below: stays put.
      key(a, 'ArrowDown');
      await settle();
      expect(host.events.length).toBe(2);

      key(a, 'ArrowUp');
      await settle();
      expect(order()).toEqual(['B', 'A', 'C', 'D', 'E']);

      key(a, 'ArrowLeft');
      await settle();
      expect(order()).toEqual([...ORIGINAL]);
      expect(document.activeElement).toBe(a);

      key(a, 'Enter');
      await settle();
      expect(a.getAttribute('aria-pressed')).toBe('false');
      expect(status()).toBe('Tile A dropped at position 1 of 5');
      expect(host.events.map((event) => [event.from, event.to])).toEqual([
        [0, 1],
        [1, 4],
        [4, 1],
        [1, 0],
      ]);
      expect(host.input).toEqual(ORIGINAL);
    });

    it('ignores arrow keys until the item is picked up', () => {
      const b = handle('B');
      expect(key(b, 'ArrowRight').defaultPrevented).toBe(false);
      expect(key(b, 'Escape').defaultPrevented).toBe(false);
      expect(host.events).toEqual([]);
    });

    it('puts the item back where it started on Escape', async () => {
      const b = handle('B');
      b.focus();
      key(b, 'Enter');
      key(b, 'ArrowRight');
      await settle();
      key(b, 'ArrowRight');
      await settle();
      expect(order()).toEqual(['A', 'C', 'D', 'B', 'E']);

      const escape = key(b, 'Escape');
      await settle();
      expect(escape.defaultPrevented).toBe(true);
      expect(order()).toEqual([...ORIGINAL]);
      expect(b.getAttribute('aria-pressed')).toBe('false');
      expect(status()).toBe('Move cancelled. Tile B is back at position 2 of 5');
      expect(document.activeElement).toBe(b);
    });

    it('drops the item when focus moves elsewhere', async () => {
      const c = handle('C');
      c.focus();
      key(c, ' ');
      await settle();
      c.dispatchEvent(new FocusEvent('focusout', { relatedTarget: el().querySelector('.outside') }));
      await settle();
      expect(c.getAttribute('aria-pressed')).toBe('false');
      expect(status()).toBe('Tile C dropped at position 3 of 5');
    });
  });

  it('moves from a button, announces it and keeps focus on the moved tile', async () => {
    const later = tile('A').querySelector<HTMLButtonElement>('.later')!;
    later.focus();
    later.click();
    await settle();
    expect(order()).toEqual(['B', 'A', 'C', 'D', 'E']);
    expect(status()).toBe('Tile A moved to position 2 of 5');
    expect(document.activeElement).toBe(later);

    // At the end the button is disabled, so focus falls back to the tile's handle.
    const dLater = tile('D').querySelector<HTMLButtonElement>('.later')!;
    dLater.focus();
    dLater.click();
    await settle();
    expect(order()).toEqual(['B', 'A', 'C', 'E', 'D']);
    expect(dLater.disabled).toBe(true);
    expect(document.activeElement).toBe(handle('D'));
  });
});
