import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ContactComponent } from './contact.component';
import { NotificationService } from '../../core/services/notification.service';
import { environment } from '../../../environments/environment';

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;
  let http: HttpTestingController;
  let notification: jasmine.SpyObj<NotificationService>;
  const url = `${environment.apiBaseUrl}/contact`;

  beforeEach(async () => {
    notification = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const fill = () =>
    component.contactForm.setValue({ name: 'Ann', email: 'ann@example.com', message: 'Hello there, nice site!' });

  it('rejects an invalid form without sending anything', () => {
    component.contactForm.setValue({ name: '', email: 'not-an-email', message: 'short' });
    component.submitForm();

    http.expectNone(url);
    expect(notification.error).toHaveBeenCalled();
  });

  it('posts the form, then resets it and confirms on success', () => {
    fill();
    component.submitForm();

    const req = http.expectOne(url);
    expect(req.request.body).toEqual({ name: 'Ann', email: 'ann@example.com', message: 'Hello there, nice site!' });
    expect(component.isSubmitting()).toBeTrue();
    req.flush({ success: true, message: 'Thanks!' });

    expect(notification.success).toHaveBeenCalledWith('Thanks!');
    expect(component.contactForm.getRawValue()).toEqual({ name: '', email: '', message: '' });
    expect(component.isSubmitting()).toBeFalse();
  });

  it('keeps the entered data and reports a server failure', () => {
    spyOn(console, 'error');
    fill();
    component.submitForm();
    http.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(notification.error).toHaveBeenCalled();
    expect(component.contactForm.value.name).toBe('Ann');
    expect(component.isSubmitting()).toBeFalse();
  });

  it('only asks for confirmation before leaving when the form has edits', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canDeactivate()).toBeTrue();
    expect(confirmSpy).not.toHaveBeenCalled();

    component.contactForm.controls.name.markAsDirty();
    expect(component.canDeactivate()).toBeFalse();
    expect(confirmSpy).toHaveBeenCalled();
  });
});
