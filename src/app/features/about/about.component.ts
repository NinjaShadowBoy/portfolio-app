import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TechnologiesService, Technology } from '../../core/services/technologies.service';
import { TechBannerComponent } from '../../shared/ui/tech-banner/tech-banner.component';

interface TechCategory {
  title: string;
  technologies: Technology[];
  direction: 'left' | 'right';
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TechBannerComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  private techService = inject(TechnologiesService);

  skills = ['Web Development', 'Backend Development', 'Mobile Development'];

  techCategories: TechCategory[] = [
    {
      title: 'Languages',
      direction: 'left',
      technologies: [
        this.techService.getTechnology('TypeScript', 3)!,
        this.techService.getTechnology('JavaScript', 3)!,
        this.techService.getTechnology('Java', 3)!,
        this.techService.getTechnology('Kotlin', 2)!,
        this.techService.getTechnology('Python', 3)!,
        this.techService.getTechnology('Go', 1)!,
        this.techService.getTechnology('C', 2.5)!,
        this.techService.getTechnology('C++', 2.5)!,
        this.techService.getTechnology('HTML5', 3.5)!,
        this.techService.getTechnology('CSS3', 3.5)!,
      ].filter(Boolean),
    },
    {
      title: 'Frontend',
      direction: 'right',
      technologies: [
        this.techService.getTechnology('Angular', 3)!,
        this.techService.getTechnology('React', 2)!,
        this.techService.getTechnology('Next.js', 1.5)!,
        this.techService.getTechnology('TailwindCSS', 2.5)!,
        this.techService.getTechnology('Bootstrap', 2.5)!,
      ].filter(Boolean),
    },
    {
      title: 'Backend',
      direction: 'left',
      technologies: [
        this.techService.getTechnology('Spring Boot', 3)!,
        this.techService.getTechnology('NestJS', 3)!,
        this.techService.getTechnology('Ktor', 1.5)!,
        this.techService.getTechnology('Node.js', 0)!,
        this.techService.getTechnology('Hibernate', 0)!,
      ].filter(Boolean),
    },
    {
      title: 'Databases',
      direction: 'right',
      technologies: [
        this.techService.getTechnology('PostgreSQL', 2)!,
        this.techService.getTechnology('MySQL', 3.5)!,
        this.techService.getTechnology('MongoDB', 1.5)!,
      ].filter(Boolean),
    },
    {
      title: 'Mobile',
      direction: 'left',
      technologies: [
        this.techService.getTechnology('Expo React Native', 2)!,
        this.techService.getTechnology('Jetpack Compose', 1.5)!,
      ].filter(Boolean),
    },
    {
      title: 'Testing',
      direction: 'right',
      technologies: [
        this.techService.getTechnology('Karma', 0)!,
        this.techService.getTechnology('Jasmine', 0)!,
        this.techService.getTechnology('Playwright', 3)!,
      ].filter(Boolean),
    },
    {
      title: 'DevOps & Tools',
      direction: 'left',
      technologies: [
        this.techService.getTechnology('Git', 3)!,
        this.techService.getTechnology('Docker', 2)!,
        this.techService.getTechnology('Linux', 2)!,
        this.techService.getTechnology('npm', 3)!,
        this.techService.getTechnology('Gradle', 1)!,
        this.techService.getTechnology('Maven', 1)!,
        this.techService.getTechnology('Stripe', 0)!,
        this.techService.getTechnology('ChatGPT', 2)!,
      ].filter(Boolean),
    },
  ];

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
