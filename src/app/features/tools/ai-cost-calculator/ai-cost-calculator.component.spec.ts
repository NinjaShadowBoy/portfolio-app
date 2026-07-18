import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { AiCostCalculatorComponent } from './ai-cost-calculator.component';
import { LLM_PRICING } from './llm-pricing.data';

describe('AiCostCalculatorComponent', () => {
  let fixture: ComponentFixture<AiCostCalculatorComponent>;
  let component: AiCostCalculatorComponent;

  /**
   * Build the component with controllable query params. ActivatedRoute is
   * stubbed so the one-shot snapshot read can be exercised; Router and
   * Location are stubbed so the debounced URL write-back never touches the
   * real browser history.
   */
  function setup(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [AiCostCalculatorComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
          },
        },
        {
          provide: Router,
          useValue: {
            createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
            serializeUrl: jasmine
              .createSpy('serializeUrl')
              .and.returnValue('/tools/ai-cost-calculator'),
          },
        },
        {
          provide: Location,
          useValue: { replaceState: jasmine.createSpy('replaceState') },
        },
      ],
    });
    fixture = TestBed.createComponent(AiCostCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders one results row per pricing entry', () => {
    setup();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(LLM_PRICING.length);
  });

  it('applies the support-chatbot preset by default', () => {
    setup();
    expect(component.activePresetId()).toBe('support-chatbot');
    expect(component.avgInputTokens()).toBe(1500);
    expect(component.avgOutputTokens()).toBe(300);
    expect(component.cachedInputPercent()).toBe(70);
    expect(component.users()).toBe(1000);
    expect(component.requestsPerUserPerDay()).toBe(10);
  });

  it('updates token signals when a preset is clicked', () => {
    setup();
    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('app-segmented-toggle button');
    buttons[1].click(); // RAG search
    fixture.detectChanges();

    expect(component.avgInputTokens()).toBe(4000);
    expect(component.avgOutputTokens()).toBe(500);
    expect(component.cachedInputPercent()).toBe(30);
    expect(component.activePresetId()).toBe('rag-search');
    expect(buttons[1].getAttribute('aria-checked')).toBe('true');
  });

  it('switches to the custom state on a manual token edit', () => {
    setup();
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('#aiCalcInputTokens');
    input.value = '2000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.avgInputTokens()).toBe(2000);
    expect(component.activePresetId()).toBeNull();
    const selected = fixture.nativeElement.querySelector(
      'app-segmented-toggle button.selected',
    );
    expect(selected).toBeFalsy();
  });

  it('highlights only the cheapest row', () => {
    setup();
    const rows: NodeListOf<HTMLTableRowElement> =
      fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[0].classList.contains('cheapest')).toBeTrue();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].classList.contains('cheapest')).toBeFalse();
    }
    // The highlighted row is the engine's cheapest estimate.
    const cheapestName = component.estimates()[0].model.name;
    expect(rows[0].textContent).toContain(cheapestName);
  });

  it('sets the document title after init', () => {
    setup();
    expect(document.title).toContain('Cost Calculator');
  });

  it('initializes inputs from query params', () => {
    setup({ u: '5000', r: '25', in: '9999', out: '1234', cache: '40' });
    expect(component.users()).toBe(5000);
    expect(component.requestsPerUserPerDay()).toBe(25);
    expect(component.avgInputTokens()).toBe(9999);
    expect(component.avgOutputTokens()).toBe(1234);
    expect(component.cachedInputPercent()).toBe(40);
    // Values match no preset -> starts in the custom state.
    expect(component.activePresetId()).toBeNull();
  });

  it('silently ignores malformed or out-of-range query params', () => {
    setup({ u: 'abc', cache: '250', in: '-5' });
    expect(component.users()).toBe(1000);
    expect(component.cachedInputPercent()).toBe(70);
    expect(component.avgInputTokens()).toBe(1500);
    expect(component.activePresetId()).toBe('support-chatbot');
  });
});
