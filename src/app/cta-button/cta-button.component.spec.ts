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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default text', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Learn More');
  });

  it('should display custom text', () => {
    component.text = 'View Details';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('View Details');
  });

  it('should render as anchor with routerLink', () => {
    component.routerLink = '/test';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('a')).toBeTruthy();
  });

  it('should render as anchor with href', () => {
    component.href = 'https://example.com';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const anchor = compiled.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('https://example.com');
  });

  it('should render as button when no link provided', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should apply correct variant class', () => {
    component.variant = 'primary';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const button = compiled.querySelector('.cta-button');
    expect(button.classList.contains('cta-primary')).toBeTruthy();
  });

  it('should render explore icon', () => {
    component.icon = 'explore';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.icon-explore')).toBeTruthy();
  });
});
