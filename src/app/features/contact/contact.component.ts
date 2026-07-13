
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { ContactService } from '../../core/services/contact.service';
import { CanComponentDeactivate } from '../../core/guards/auth.guard';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
})
export class ContactComponent implements CanComponentDeactivate {
  private notificationService = inject(NotificationService);
  private contactService = inject(ContactService);

  isSubmitting = false;

  contactForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    message: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
  });

  submitForm(): void {
    if (this.contactForm.invalid) {
      this.notificationService.error($localize`@@contactFillFields:Please fill out all fields correctly.`);
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.contactForm.value;

    this.contactService.submitContactForm({
      name: formValue.name || '',
      email: formValue.email || '',
      message: formValue.message || ''
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.notificationService.success(
            response.message || $localize`@@contactSuccess:Thank you for your message! I'll get back to you soon.`
          );
          this.contactForm.reset();
        } else {
          this.notificationService.error(
            response.message || $localize`@@contactSubmitFailed:Failed to submit contact form. Please try again.`
          );
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting contact form:', error);
        this.notificationService.error(
          $localize`@@contactSendFailed:Failed to send message. Please try again later or reach out via email.`
        );
      }
    });
  }

  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean =
    () => {
      if (this.contactForm.dirty && !this.contactForm.pristine) {
        return confirm(
          $localize`@@contactLeaveConfirm:Contact form entered data will be lost. Are you sure you want to leave?`
        );
      }
      return true;
    };
}
