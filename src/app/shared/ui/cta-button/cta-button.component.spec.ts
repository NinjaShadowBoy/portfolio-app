import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CtaButtonComponent } from './cta-button.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('CtaButtonComponent', () => {
  let component: CtaButtonComponent;
  let fixture: ComponentFixture<CtaButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaButtonComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaButtonComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('should display default text', async () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Learn More');
  });

  it('should display custom text', async () => {
    fixture.componentRef.setInput('text', 'View Details');
    await fixture.whenStable();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('View Details');
  });

  it('should render as anchor with routerLink', async () => {
    fixture.componentRef.setInput('routerLink', '/test');
    await fixture.whenStable();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('a')).toBeTruthy();
  });

  it('should render as anchor with href', async () => {
    fixture.componentRef.setInput('href', 'https://example.com');
    await fixture.whenStable();
    const compiled = fixture.nativeElement;
    const anchor = compiled.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('https://example.com');
  });

  it('should render as button when no link provided', async () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should apply correct variant class', async () => {
    fixture.componentRef.setInput('variant', 'primary');
    await fixture.whenStable();
    const compiled = fixture.nativeElement;
    const button = compiled.querySelector('.cta-button');
    expect(button.classList.contains('cta-primary')).toBeTruthy();
  });

  it('should render explore icon', async () => {
    fixture.componentRef.setInput('icon', 'explore');
    await fixture.whenStable();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.icon-explore')).toBeTruthy();
  });
});
