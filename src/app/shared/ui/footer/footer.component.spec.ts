import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display current year in copyright', () => {
    const currentYear = new Date().getFullYear();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain(currentYear.toString());
  });

  it('should have social links', () => {
    expect(component.socialLinks.length).toBeGreaterThan(0);
  });

  it('should have quick links', () => {
    expect(component.quickLinks.length).toBeGreaterThan(0);
  });

  it('should have contact information', () => {
    expect(component.contactInfo).toBeDefined();
    expect(component.contactInfo.email).toBeDefined();
    expect(component.contactInfo.phone).toBeDefined();
    expect(component.contactInfo.location).toBeDefined();
  });
});
