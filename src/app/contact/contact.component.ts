import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { CanComponentDeactivate } from '../guards/auth.guard';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
      Validators.minLength(2),
    ]),
  });
  name: string = '';
  email: string = '';
  message: string = '';

  submitForm(): void {
    console.log('Form Submitted!', this.contactForm.value);
    if (this.name && this.email && this.message) {
      this.notificationService.success('Message sent successfully!');
      this.name = '';
      this.email = '';
      this.message = '';
    } else {
      this.notificationService.error('Please fill out all fields.');
    }
  }

  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean =
    () => {
      if (this.name.length || this.email.length || this.message.length) {
        return confirm(
          'Contact form enterd data will be lost. Are you sure to leave ?'
        );
      } else {
        return true;
      }
    };
}
