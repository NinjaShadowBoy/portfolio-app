import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  let fixture: ComponentFixture<PrivacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PrivacyComponent);
    fixture.detectChanges();
  });

  /** The paragraph of the "Chat assistant" section, whitespace normalised. */
  const chatBody = (): string =>
    Array.from((fixture!.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('section'))
      .find((section: HTMLElement) =>
        section.querySelector('h2')?.textContent?.includes('Chat assistant'))!
      .querySelector('p')!.textContent!.replace(/\s+/g, ' ');

  it('states what is stored from a chat, and what is not', () => {
    const body = chatBody();
    expect(body).toContain('Voyage AI');
    expect(body).toContain('computes the search embeddings');
    expect(body).toContain('no transcripts');
    expect(body).toContain('daily message count per visitor');
    expect(body).toContain('sessionStorage');
  });

  it('sends chat messages through OpenRouter, not directly to Anthropic', () => {
    const body = chatBody();

    expect(body).toContain('sent through OpenRouter');
    expect(body).toContain("Anthropic's Claude");
    expect(body).not.toContain('sent to Anthropic');
  });

  it('links OpenRouter like the other third-party links', () => {
    const root = fixture!.nativeElement as HTMLElement;
    const section = Array.from(root.querySelectorAll<HTMLElement>('section'))
      .find((item: HTMLElement) =>
        item.querySelector('h2')?.textContent?.includes('Chat assistant'))!;
    const openrouter = Array.from(section.querySelectorAll<HTMLAnchorElement>('p a'))
      .find((a: HTMLAnchorElement) => a.textContent === 'OpenRouter')!;

    expect(openrouter.getAttribute('href')).toBe('https://openrouter.ai');
    expect(openrouter.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
