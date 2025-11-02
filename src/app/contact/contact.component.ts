import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { CanComponentDeactivate } from '../guards/auth.guard';
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
      this.notificationService.error('Please fill out all fields correctly.');
      return;
    }

    console.log('Form Submitted!', this.contactForm.value);

    // Inform user that the contact form is not yet functional
    this.notificationService.info(
      'Contact form is currently under development. Please reach out via email or social media for now.',
      7000 // Display for 7 seconds
    );
    this.contactForm.reset();
  }

  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean =
    () => {
      if (this.contactForm.dirty && !this.contactForm.pristine) {
        return confirm(
          'Contact form entered data will be lost. Are you sure you want to leave?'
        );
      }
      return true;
    };
}
