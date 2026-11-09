import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Box, columnCount, moveItem, nearestIndex, rowStep } from '../../../core/utils/reorder';

/** A finished move. `items` is a new array; the grid never changes its input. */
export interface ReorderEvent<T> {
  readonly items: T[];
  readonly from: number;
  readonly to: number;
}

/** Pointer travel, in CSS pixels, before a press on the handle becomes a drag. */
export const REORDER_DRAG_THRESHOLD_PX = 4;

interface KeyboardGrab {
  /** Where the item was when it was picked up; Escape returns it there. */
  readonly origin: number;
  /** Where it is now. */
  readonly index: number;
}

/**
 * Reorderable grid (or list) of tiles. Three directives work together:
 *
 * ```html
 * <ul [appReorderGrid]="photos()" #grid="appReorderGrid" (reordered)="save($event.items)">
 *   @for (photo of photos(); track photo.id; let i = $index) {
 *     <li [appReorderItem]="i" [reorderLabel]="'Photo ' + photo.id">
 *       <button type="button" appReorderHandle aria-label="Reorder">...</button>
 *       <button type="button" (click)="grid.move(i, i - 1)">Move earlier</button>
 *     </li>
 *   }
 * </ul>
 * ```
 *
 * - Pointer (mouse, pen, touch) drag on the handle; the drop target is the
 *   tile whose centre is nearest the pointer, so it works in any number of
 *   columns. The handle sets `touch-action: none`.
 * - Keyboard on the handle: Space/Enter picks up and drops, arrows move
 *   (left/right in reading order, up/down by one rendered row), Escape cancels.
 * - `move(from, to)` for buttons. Every move is announced in a polite live region.
 *
 * The grid only emits `reordered`; the parent applies the order and passes the
 * new list back in. Track the `@for` by a stable key (not `$index`) so the
 * moved tile keeps its DOM node and focus can follow it.
 */
@Directive({
  selector: '[appReorderGrid]',
  exportAs: 'appReorderGrid',
  host: { class: 'reorder-grid' },
})
export class ReorderGridDirective<T> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly items = input.required<readonly T[]>({ alias: 'appReorderGrid' });
  readonly reordered = output<ReorderEvent<T>>();

  /** Index of the tile being dragged with a pointer. */
  readonly dragIndex = signal<number | null>(null);
  /** Index the dragged tile would land on if dropped now. */
  readonly dropTarget = signal<number | null>(null);
  /** Keyboard pick-up in progress. */
  readonly grab = signal<KeyboardGrab | null>(null);

  private readonly tiles = new Set<ReorderItemDirective>();
  private liveRegion: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liveRegion?.remove());
  }

  /**
   * Moves the item at `from` to `to`, announces it and keeps focus on the
   * moved tile (the focused control if it is still usable, else its handle).
   * Returns false when there is nothing to move.
   */
  move(from: number, to: number): boolean {
    const name = this.labelAt(from);
    if (!this.commit(from, to)) return false;
    const position = to + 1;
    const total = this.items().length;
    this.announce($localize`:@@dataTableMoved:${name}:name: moved to position ${position}:position: of ${total}:total:`);
    return true;
  }

  /** @internal Keyboard: picks up the item at `index`. */
  pickUp(index: number) {
    this.grab.set({ origin: index, index });
    const name = this.labelAt(index);
    const position = index + 1;
    const total = this.items().length;
    this.announce(
      $localize`:@@reorderGridPickedUp:${name}:name: picked up at position ${position}:position: of ${total}:total:. Use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.`
    );
  }

  /** @internal Keyboard: moves the picked-up item one step. */
  step(key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') {
    const grab = this.grab();
    if (!grab) return;
    const total = this.items().length;
    let target: number;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      target = grab.index + (key === 'ArrowLeft' ? -1 : 1);
    } else {
      target = rowStep(grab.index, key === 'ArrowUp' ? -1 : 1, columnCount(this.boxes()), total);
    }
    if (target < 0 || target >= total || target === grab.index) return;
    if (this.move(grab.index, target)) this.grab.set({ ...grab, index: target });
  }

  /** @internal Keyboard: drops the picked-up item where it is. */
  drop() {
    const grab = this.grab();
    if (!grab) return;
    this.grab.set(null);
    const name = this.labelAt(grab.index);
    const position = grab.index + 1;
    const total = this.items().length;
    this.announce($localize`:@@reorderGridDropped:${name}:name: dropped at position ${position}:position: of ${total}:total:`);
  }

  /** @internal Keyboard: puts the picked-up item back where it started. */
  cancel() {
    const grab = this.grab();
    if (!grab) return;
    this.grab.set(null);
    const name = this.labelAt(grab.index);
    this.commit(grab.index, grab.origin);
    const position = grab.origin + 1;
    const total = this.items().length;
    this.announce(
      $localize`:@@reorderGridCancelled:Move cancelled. ${name}:name: is back at position ${position}:position: of ${total}:total:`
    );
  }

  /** @internal Where the dragged tile would land, for the drop indicator on the tile at `index`. */
  dropSide(index: number): 'before' | 'after' | null {
    const from = this.dragIndex();
    if (from === null || this.dropTarget() !== index || index === from) return null;
    return index < from ? 'before' : 'after';
  }

  /** @internal Rendered boxes of the tiles, in index order. */
  boxes(): Box[] {
    return this.sortedTiles().map((tile) => tile.element.getBoundingClientRect());
  }

  /** @internal */
  register(tile: ReorderItemDirective) {
    this.tiles.add(tile);
  }

  /** @internal */
  unregister(tile: ReorderItemDirective) {
    this.tiles.delete(tile);
  }

  private commit(from: number, to: number): boolean {
    const items = this.items();
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return false;
    const active = this.document.activeElement;
    const keep = active instanceof HTMLElement && this.host.nativeElement.contains(active) ? active : null;
    this.reordered.emit({ items: moveItem(items, from, to), from, to });
    this.restoreFocus(to, keep);
    return true;
  }

  /** Re-rendering moves the tile's DOM node, which can drop focus; put it back once rendered. */
  private restoreFocus(index: number, previous: HTMLElement | null) {
    if (!previous) return;
    afterNextRender(
      () => {
        const usable = previous.isConnected && !(previous as HTMLButtonElement).disabled;
        const target = usable ? previous : this.tileAt(index)?.handle?.element;
        target?.focus();
      },
      { injector: this.injector }
    );
  }

  private announce(message: string) {
    if (!this.liveRegion) {
      const region = this.document.createElement('div');
      region.className = 'reorder-grid-status';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      this.host.nativeElement.appendChild(region);
      this.liveRegion = region;
    }
    this.liveRegion.textContent = message;
  }

  private labelAt(index: number): string {
    return this.tileAt(index)?.label() ?? String(index + 1);
  }

  private tileAt(index: number): ReorderItemDirective | undefined {
    return [...this.tiles].find((tile) => tile.index() === index);
  }

  private sortedTiles(): ReorderItemDirective[] {
    return [...this.tiles].sort((a, b) => a.index() - b.index());
  }
}

/** One tile of an `appReorderGrid`. `appReorderItem` is its current index. */
@Directive({
  selector: '[appReorderItem]',
  host: {
    class: 'reorder-item',
    '[class.reorder-item--dragging]': 'grid.dragIndex() === index()',
    '[class.reorder-item--grabbed]': 'grid.grab()?.index === index()',
    '[attr.data-reorder-drop]': 'grid.dropSide(index())',
  },
})
export class ReorderItemDirective {
  protected readonly grid = inject<ReorderGridDirective<unknown>>(ReorderGridDirective);
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly index = input.required<number>({ alias: 'appReorderItem' });
  /** Names the item in announcements, for example "Photo 12". */
  readonly label = input.required<string>({ alias: 'reorderLabel' });

  /** @internal Set by the tile's `appReorderHandle`. */
  handle: ReorderHandleDirective | null = null;

  constructor() {
    this.grid.register(this);
    inject(DestroyRef).onDestroy(() => this.grid.unregister(this));
  }
}

interface PointerDrag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly from: number;
  /** Tile boxes when the press started; the grid does not reflow while dragging. */
  readonly boxes: readonly Box[];
  dragging: boolean;
}

/**
 * The drag handle of an `appReorderItem`. Put it on a `<button>` with an
 * accessible name; it gets `aria-pressed` while picked up with the keyboard.
 */
@Directive({
  selector: '[appReorderHandle]',
  host: {
    class: 'reorder-handle',
    '[style.touch-action]': '"none"',
    '[attr.aria-pressed]': 'grabbed()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'endDrag(false)',
    '(lostpointercapture)': 'endDrag(false)',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ReorderHandleDirective {
  private readonly grid = inject<ReorderGridDirective<unknown>>(ReorderGridDirective);
  private readonly item = inject(ReorderItemDirective);
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private drag: PointerDrag | null = null;

  constructor() {
    this.item.handle = this;
    inject(DestroyRef).onDestroy(() => {
      if (this.item.handle === this) this.item.handle = null;
      if (this.drag) this.endDrag(false);
    });
  }

  protected grabbed(): boolean {
    return this.grid.grab()?.index === this.item.index();
  }

  protected onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || this.drag) return;
    if (this.grid.grab()) this.grid.drop();
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      from: this.item.index(),
      boxes: this.grid.boxes(),
      dragging: false,
    };
    // Capture keeps move/up events on the handle when the pointer leaves it.
    if (typeof this.element.setPointerCapture === 'function') {
      try {
        this.element.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events have no active pointer to capture.
      }
    }
  }

  protected onPointerMove(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.hypot(dx, dy) < REORDER_DRAG_THRESHOLD_PX) return;
      drag.dragging = true;
      this.grid.dragIndex.set(drag.from);
    }
    event.preventDefault();
    this.item.element.style.transform = `translate(${dx}px, ${dy}px)`;
    const over = nearestIndex({ x: event.clientX, y: event.clientY }, drag.boxes);
    this.grid.dropTarget.set(over === -1 ? drag.from : over);
  }

  protected onPointerUp(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.endDrag(this.drag.dragging);
  }

  /** Ends a pointer drag; `commit` moves the tile to the current drop target. */
  protected endDrag(commit: boolean) {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    const to = this.grid.dropTarget();
    this.item.element.style.transform = '';
    this.grid.dragIndex.set(null);
    this.grid.dropTarget.set(null);
    if (this.element.hasPointerCapture?.(drag.pointerId)) this.element.releasePointerCapture(drag.pointerId);
    if (commit && to !== null) this.grid.move(drag.from, to);
  }

  protected onKeydown(event: KeyboardEvent) {
    if (this.drag) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.endDrag(false);
      }
      return;
    }
    const grabbed = this.grabbed();
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (grabbed) this.grid.drop();
        else this.grid.pickUp(this.item.index());
        return;
      case 'Escape':
        if (!grabbed) return;
        // Also keeps an enclosing dialog from closing.
        event.preventDefault();
        event.stopPropagation();
        this.grid.cancel();
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        if (!grabbed) return;
        event.preventDefault();
        this.grid.step(event.key);
        return;
    }
  }

  /**
   * Tabbing away drops the item where it is. Re-rendering a moved tile can
   * also blur the handle, but then there is no `relatedTarget`.
   */
  protected onFocusOut(event: FocusEvent) {
    if (this.grabbed() && event.relatedTarget instanceof Node && event.relatedTarget !== this.element) {
      this.grid.drop();
    }
  }
}

/** Import all three: `imports: [...REORDER_GRID]`. */
export const REORDER_GRID = [ReorderGridDirective, ReorderItemDirective, ReorderHandleDirective] as const;
