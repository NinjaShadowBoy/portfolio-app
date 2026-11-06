import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FooterComponent } from './footer.component';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../../../core/constants/contact';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('shows the current year in the copyright line', () => {
    expect(el.querySelector('.copyright')?.textContent).toContain(String(new Date().getFullYear()));
  });

  it('renders every social link as a new-tab anchor with an accessible label', () => {
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.social-links a'));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('links the contact email and phone with mailto: and tel:', () => {
    expect(el.querySelector(`a[href="mailto:${CONTACT_EMAIL}"]`)).toBeTruthy();
    expect(el.querySelector(`a[href="tel:${CONTACT_PHONE}"]`)).toBeTruthy();
  });

  it('routes the quick links to their pages', () => {
    const hrefs = Array.from(el.querySelectorAll('.footer-nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/home', '/projects', '/publications', '/about', '/contact', '/tools']);
  });

  it('has no links that only lead back to the privacy page', () => {
    const privacy = el.querySelectorAll('.footer-bottom a[href="/privacy"]');
    expect(privacy.length).toBe(1);
    expect(el.textContent).not.toContain('Terms of Service');
    expect(el.textContent).not.toContain('Cookie Policy');
  });

  it('offers log in to visitors', () => {
    expect(el.querySelector('.footer-bottom a[href="/login"]')).toBeTruthy();
  });
});
