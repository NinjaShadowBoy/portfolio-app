import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BackToTopComponent } from './back-to-top.component';
import { ScrollStateService } from '../../../core/services/scroll-state.service';
import { ChatUiService } from '../../../core/services/chat-ui.service';

describe('BackToTopComponent', () => {
  let fixture: ComponentFixture<BackToTopComponent>;
  const pastFirstScreen = signal(false);
  const headerHidden = signal(false);
  const chatOpen = signal(false);

  beforeEach(async () => {
    pastFirstScreen.set(false);
    headerHidden.set(false);
    chatOpen.set(false);
    await TestBed.configureTestingModule({
      imports: [BackToTopComponent],
      providers: [
        { provide: ScrollStateService, useValue: { pastFirstScreen, headerHidden } },
        { provide: ChatUiService, useValue: { open: chatOpen } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BackToTopComponent);
    fixture.detectChanges();
  });

  const button = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.back-to-top');

  it('shows past the first screen while the header is shown, and never over the chat', () => {
    expect(button()).toBeNull();

    pastFirstScreen.set(true);
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-label')).toBe('Back to top');

    headerHidden.set(true);
    fixture.detectChanges();
    expect(button()).toBeNull();

    headerHidden.set(false);
    chatOpen.set(true);
    fixture.detectChanges();
    expect(button()).toBeNull();
  });

  it('scrolls to the top and moves focus to the main content', () => {
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    document.body.appendChild(main);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    pastFirstScreen.set(true);
    fixture.detectChanges();
    button()!.click();

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(document.activeElement).toBe(main);
    main.remove();
  });
});
