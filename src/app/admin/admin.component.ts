import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  get user() { return this.auth.user(); }
  get isAdmin() { return this.auth.isAdmin(); }

  goHome() { this.router.navigateByUrl('/home'); }
}
