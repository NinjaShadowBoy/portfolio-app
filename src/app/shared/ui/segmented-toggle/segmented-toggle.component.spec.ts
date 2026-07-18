import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SegmentedToggleComponent,
  SegmentedToggleOption,
} from './segmented-toggle.component';

const OPTIONS: SegmentedToggleOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('SegmentedToggleComponent', () => {
  let fixture: ComponentFixture<SegmentedToggleComponent>;

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentedToggleComponent);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('selected', 'b');
    fixture.componentRef.setInput('ariaLabel', 'Choice');
    fixture.detectChanges();
  });

  it('renders one radio button per option inside a labelled radiogroup', () => {
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]');
    expect(group.getAttribute('aria-label')).toBe('Choice');
    expect(buttons().length).toBe(3);
    expect(buttons().map((b) => b.textContent!.trim())).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);
  });

  it('marks the selected option checked with a roving tabindex', () => {
    const [a, b, c] = buttons();
    expect(b.getAttribute('aria-checked')).toBe('true');
    expect(a.getAttribute('aria-checked')).toBe('false');
    expect(b.tabIndex).toBe(0);
    expect(a.tabIndex).toBe(-1);
    expect(c.tabIndex).toBe(-1);
  });

  it('emits selectedChange when a different option is clicked', () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectedChange.subscribe((v) => emitted.push(v));
    buttons()[2].click();
    expect(emitted).toEqual(['c']);
  });

  it('does not emit when the active option is clicked again', () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectedChange.subscribe((v) => emitted.push(v));
    buttons()[1].click();
    expect(emitted).toEqual([]);
  });

  it('moves selection with arrow keys, wrapping at the ends', () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectedChange.subscribe((v) => emitted.push(v));
    buttons()[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    buttons()[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(emitted).toEqual(['c', 'c']);
  });

  it('shows no thumb and keeps the first option tabbable when selected is null', async () => {
    fixture.componentRef.setInput('selected', null);
    fixture.detectChanges();
    // The thumb rect is recomputed in an after-render effect; one more CD
    // pass lets the @if react to the now-null rect.
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.segmented-thumb')).toBeNull();
    expect(buttons()[0].tabIndex).toBe(0);
    expect(
      buttons().every((b) => b.getAttribute('aria-checked') === 'false'),
    ).toBeTrue();
  });
});
