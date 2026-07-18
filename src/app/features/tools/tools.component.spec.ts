import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { ToolsComponent } from './tools.component';
import { PRICING_AS_OF } from './ai-cost-calculator/llm-pricing.data';

describe('ToolsComponent', () => {
  let fixture: ComponentFixture<ToolsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToolsComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ToolsComponent);
    fixture.detectChanges();
  });

  it('renders the AI cost calculator card', () => {
    const card = fixture.nativeElement.querySelector('.tool-card');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('AI API Cost Calculator');
  });

  it('links the card to /tools/ai-cost-calculator', () => {
    const card: HTMLAnchorElement =
      fixture.nativeElement.querySelector('a.tool-card');
    expect(card.getAttribute('href')).toBe('/tools/ai-cost-calculator');
  });

  it('surfaces the pricing "as of" date on the card', () => {
    const meta = fixture.nativeElement.querySelector('.tool-meta');
    expect(meta.textContent).toContain(PRICING_AS_OF);
  });

  it('sets the document title', () => {
    expect(TestBed.inject(Title).getTitle()).toContain('Developer Tools');
  });
});
