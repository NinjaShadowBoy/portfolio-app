import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  skills = ['Web Development', 'Backend Development', 'Mobile Development'];

  hobbies = [
    { name: 'Basketball', detail: 'Since 2016' },
    { name: 'Taekwondo', detail: 'White Belt' },
    { name: 'Chess', detail: '400 ELO' },
    { name: 'Teaching', detail: 'Soft Skill' },
    { name: 'Teamwork', detail: 'Soft Skill' }
  ];

  cvPath = 'assets/docs/CV-Abena_Alex_Nelson_Ryan-en.pdf';

  downloadCV(): void {
    const link = document.createElement('a');
    link.href = this.cvPath;
    link.download = 'CV-Abena_Alex_Nelson_Ryan.pdf';
    link.click();
  }
}
