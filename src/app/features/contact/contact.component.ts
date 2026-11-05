import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { ContactService } from '../../core/services/contact.service';
import { CanComponentDeactivate } from '../../core/guards/auth.guard';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent implements CanComponentDeactivate {
  private notificationService = inject(NotificationService);
  private contactService = inject(ContactService);

  readonly isSubmitting = signal(false);

  contactForm = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  submitForm(): void {
    if (this.contactForm.invalid) {
      this.notificationService.error($localize`:@@contactFillFields:Please fill out all fields correctly.`);
      return;
    }
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.contactService
      .submitContactForm(this.contactForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              response.message || $localize`:@@contactSuccess:Thank you for your message! I'll get back to you soon.`
            );
            this.contactForm.reset();
          } else {
            this.notificationService.error(
              response.message || $localize`:@@contactSubmitFailed:Failed to submit contact form. Please try again.`
            );
          }
        },
        error: (error) => {
          console.error('Error submitting contact form:', error);
          this.notificationService.error(
            $localize`:@@contactSendFailed:Failed to send message. Please try again later or reach out via email.`
          );
        },
      });
  }

  /** Ask before leaving with unsent edits. */
  canDeactivate(): boolean {
    return (
      !this.contactForm.dirty ||
      confirm($localize`:@@contactLeaveConfirm:Contact form entered data will be lost. Are you sure you want to leave?`)
    );
  }
}
