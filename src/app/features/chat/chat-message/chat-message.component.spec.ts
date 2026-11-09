import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ChatMessageComponent } from './chat-message.component';
import type { ChatMessage } from '../chat.service';

describe('ChatMessageComponent', () => {
  let fixture: ComponentFixture<ChatMessageComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [provideRouter([])],
    });
  });

  function render(message: Partial<ChatMessage>, allowed: string[] = []): HTMLElement {
    fixture = TestBed.createComponent(ChatMessageComponent);
    fixture.componentRef.setInput('message', { role: 'assistant', text: '', ...message });
    fixture.componentRef.setInput('allowedLinks', new Set(allowed));
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    return host;
  }

  function anchor(): HTMLAnchorElement {
    return host.querySelector('a') as HTMLAnchorElement;
  }

  it('turns a known internal path into a routerLink', () => {
    render({ text: 'See [the about page](/about).' });

    expect(anchor().textContent).toBe('the about page');
    expect(anchor().getAttribute('href')).toBe('/about');
    expect(anchor().hasAttribute('target')).toBe(false);
    expect(fixture.debugElement.query(By.directive(RouterLink))).not.toBeNull();
  });

  it('renders a project path with an id as a routerLink', () => {
    render({ text: '[Project 12](/projects/12)' });

    expect(anchor().getAttribute('href')).toBe('/projects/12');
    expect(fixture.debugElement.query(By.directive(RouterLink))).not.toBeNull();
  });

  it('downloads a PDF from the site root', () => {
    render({ text: '[The paper](/papers/paper.pdf)' });

    expect(anchor().getAttribute('href')).toBe('/papers/paper.pdf');
    expect(anchor().getAttribute('download')).toBe('paper.pdf');
  });

  it('renders a download card for the CV the API sent', () => {
    render({
      text: 'The button is below.',
      links: [{ title: 'CV, French (PDF)', url: '/assets/docs/Alex_Abena_cv-fr.pdf', kind: 'download' }],
    });

    const card = fixture.nativeElement.querySelector('.chat-card-download') as HTMLAnchorElement;
    expect(card.getAttribute('href')).toBe('/assets/docs/Alex_Abena_cv-fr.pdf');
    expect(card.getAttribute('download')).toBe('Alex_Abena_cv-fr.pdf');
    expect(card.textContent).toContain('CV, French (PDF)');
  });

  it('never downloads a PDF outside the papers and the CVs', () => {
    render({
      text: '[x](/assets/docs/secret.pdf)',
      links: [{ title: 'x', url: '/assets/docs/secret.pdf', kind: 'download' }],
    });

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('allows an external URL the API returned, in a new tab', () => {
    render({ text: '[repo](https://example.com/alex/repo)' }, ['https://example.com/alex/repo']);

    expect(anchor().getAttribute('href')).toBe('https://example.com/alex/repo');
    expect(anchor().getAttribute('target')).toBe('_blank');
    expect(anchor().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('allows the profile hosts without a links event', () => {
    render({ text: '[me](https://www.github.com/alex)' });

    expect(anchor().getAttribute('href')).toBe('https://www.github.com/alex');
  });

  it('renders an unknown external URL as plain text', () => {
    render({ text: '[click here](https://evil.example/x)' });

    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent).toContain('click here');
  });

  it('renders a javascript: URL as plain text', () => {
    render({ text: '[click](javascript:alert(1))' });

    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent).toContain('click');
  });

  it('renders raw HTML and images as text', () => {
    render({ text: '<img src="x" onerror="alert(1)"> <b>bold</b>' });

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('b')).toBeNull();
    expect(host.textContent).toContain('<img');
  });

  it('renders lists, bold and inline code', () => {
    render({ text: '- one\n- two\n\n**bold** and `code`' });

    expect(host.querySelectorAll('li')).toHaveLength(2);
    expect(host.querySelector('strong')?.textContent).toBe('bold');
    expect(host.querySelector('code')?.textContent).toBe('code');
  });

  it('renders numbered lists and italics', () => {
    render({ text: '1. first\n2. second\n\n*slanted*' });

    expect(host.querySelectorAll('ol li')).toHaveLength(2);
    expect(host.querySelector('em')?.textContent).toBe('slanted');
  });

  it('adds no card for links the answer already makes clickable', () => {
    render({
      text: 'Here is [the project](/projects/12).',
      links: [{ title: 'Portfolio', url: '/projects/12', kind: 'project' }],
    });

    expect(host.querySelectorAll('a')).toHaveLength(1);
    expect(host.querySelector('.chat-card-download')).toBeNull();
  });

  it('marks each link with an icon for where it goes', () => {
    render({ text: '[page](/about) [paper](/papers/x.pdf) [code](https://github.com/alex/x)' });

    const icons = [...host.querySelectorAll('a')].map((a) => a.querySelector('.chat-link-icon path')?.getAttribute('d'));
    expect(icons).toHaveLength(3);
    expect(new Set(icons).size).toBe(3);
    expect(host.querySelector('a .chat-link-icon')?.getAttribute('aria-hidden')).toBe('true');
  });
});
