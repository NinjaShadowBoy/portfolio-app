import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TechnologiesService, Technology } from '../../core/services/technologies.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  private techService = inject(TechnologiesService);

  skills = ['Web Development', 'Backend Development', 'Mobile Development'];

  // Core technologies displayed on the About page
  coreTechnologies: Technology[] = [
    this.techService.getTechnology('TypeScript')!,
    this.techService.getTechnology('JavaScript')!,
    this.techService.getTechnology('Angular')!,
    this.techService.getTechnology('React')!,
    this.techService.getTechnology('Kotlin')!,
    this.techService.getTechnology('Java')!,
    this.techService.getTechnology('Spring Boot')!,
    this.techService.getTechnology('PostgreSQL')!,
    this.techService.getTechnology('Docker')!,
    this.techService.getTechnology('Git')!,
    this.techService.getTechnology('Expo React Native')!,
  ].filter(Boolean);

  hobbies = [
    { name: 'Basketball', detail: 'Since 2016' },
    { name: 'Taekwondo', detail: 'White Belt' },
    { name: 'Chess', detail: '400 ELO' },
    { name: 'Teaching', detail: 'Soft Skill' },
    { name: 'Teamwork', detail: 'Soft Skill' }
  ];

  cvPathEn = 'assets/docs/cv-en.pdf';
  cvPathFr = 'assets/docs/cv-fr.pdf';

  downloadCV(lang: 'en' | 'fr'): void {
    const link = document.createElement('a');
    link.href = lang === 'en' ? this.cvPathEn : this.cvPathFr;
    link.download = lang === 'en' ? 'cv-en.pdf' : 'cv-fr.pdf';
    link.click();
  }
}

