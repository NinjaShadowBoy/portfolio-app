import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

/** One choice in a segmented toggle. Labels arrive already localized. */
export interface SegmentedToggleOption {
  /** Stable value reported through `selectedChange`. */
  value: string;
  /** Visible button text. */
  label: string;
}

/**
 * Segmented toggle — the sliding-thumb control from the login page, promoted
 * to a shared component and used everywhere a mutually-exclusive choice is
 * offered (login/register, calculator presets, feedback type).
 *
 * Controlled component: the parent owns the selection and passes it back in
 * via `selected`; the component only emits `selectedChange` (never for the
 * already-active option). `selected` may be null — "no active choice", used
 * by the calculator when the inputs match no preset — in which case no thumb
 * is shown.
 *
 * The thumb is measured from the active button's offset box after each render
 * (and on container resize), so it stays correct with variable-width labels
 * and multi-row wrapping. After-render hooks never run on the server, so SSR
 * output falls back to CSS-only styling of the `.selected` button; the thumb
 * appears on hydration.
 *
 * Accessibility: a `radiogroup` of `radio` buttons with roving tabindex and
 * arrow-key/Home/End navigation (selection follows focus).
 */
@Component({
  selector: 'app-segmented-toggle',
  standalone: true,
  templateUrl: './segmented-toggle.component.html',
  styleUrls: ['./segmented-toggle.component.css'],
})
export class SegmentedToggleComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  /** The choices, in render order. */
  readonly options = input.required<readonly SegmentedToggleOption[]>();

  /** Value of the active option, or null for "none". */
  readonly selected = input<string | null>(null);

  /** Accessible group label (already localized by the parent). */
  readonly ariaLabel = input('');

  /** Emits the clicked/keyed option's value; never fires for the active one. */
  readonly selectedChange = output<string>();

  private buttons = viewChildren<ElementRef<HTMLButtonElement>>('btn');

  /** Bumped by the ResizeObserver to re-measure after layout changes. */
  private resizeTick = signal(0);

  /** Offset box of the active button, or null when nothing is selected. */
  protected readonly thumbRect = signal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  /** True one frame after the first measurement — gates the slide animation
   *  so the thumb never animates in from the container origin. */
  protected readonly thumbReady = signal(false);

  constructor() {
    afterRenderEffect(() => {
      // Track everything that can move the active button, then measure.
      this.selected();
      this.options();
      this.buttons();
      this.resizeTick();
      this.measureThumb();
    });

    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() =>
        this.resizeTick.update((v) => v + 1),
      );
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected select(value: string): void {
    if (value !== this.selected()) {
      this.selectedChange.emit(value);
    }
  }

  /** Roving tabindex: only the active option (or the first) is tabbable. */
  protected tabIndexFor(index: number): number {
    const selected = this.selected();
    const activeIndex =
      selected === null
        ? 0
        : Math.max(
            0,
            this.options().findIndex((option) => option.value === selected),
          );
    return index === activeIndex ? 0 : -1;
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const options = this.options();
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(options[next].value);
    this.buttons()[next]?.nativeElement.focus();
  }

  private measureThumb(): void {
    const selected = this.selected();
    const index = this.options().findIndex(
      (option) => option.value === selected,
    );
    const button = index === -1 ? undefined : this.buttons()[index];
    if (!button) {
      this.thumbRect.set(null);
      return;
    }
    const el = button.nativeElement;
    this.thumbRect.set({
      x: el.offsetLeft,
      y: el.offsetTop,
      w: el.offsetWidth,
      h: el.offsetHeight,
    });
    if (!this.thumbReady()) {
      // Enable the slide transition only after the initial position painted.
      requestAnimationFrame(() => this.thumbReady.set(true));
    }
  }
}
