import { Component } from '@angular/core';
import { downloadCV } from '../../core/constants/cv';
import { TechTagsComponent } from '../../shared/ui/tech-tags/tech-tags.component';
import { FlagComponent } from '../../shared/ui/flag/flag.component';

@Component({
  selector: 'app-about',
  imports: [TechTagsComponent, FlagComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {
  readonly skills = [
    $localize`:@@aboutSkillBackend:Backend & APIs`,
    $localize`:@@aboutSkillAi:AI & LLM integration`,
    $localize`:@@aboutSkillWeb:Full-stack web`,
    $localize`:@@aboutSkillMobile:Mobile`,
  ];

  readonly techCategories = [
    {
      title: 'Languages',
      technologies: ['TypeScript', 'JavaScript', 'Java', 'Kotlin', 'Python', 'Go', 'C', 'C++', 'HTML5', 'CSS3'],
    },
    { title: 'Frontend', technologies: ['Angular', 'Nuxt', 'React', 'Next.js', 'TailwindCSS', 'Bootstrap'] },
    {
      title: 'Backend',
      technologies: ['Spring Boot', 'NestJS', 'Gin', 'Ktor', 'Node.js', 'Hibernate', 'Chi', 'SDL', 'Arduino'],
    },
    { title: 'Databases', technologies: ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite'] },
    { title: 'Mobile', technologies: ['Expo React Native', 'Jetpack Compose'] },
    { title: 'Testing', technologies: ['Karma', 'Jasmine', 'Playwright'] },
    {
      title: 'DevOps & Tools',
      technologies: ['Git', 'Docker', 'Linux', 'npm', 'Gradle', 'Maven', 'Stripe', 'ChatGPT'],
    },
  ];

  readonly hobbies = [
    {
      name: $localize`:@@aboutHobbyBasketball:Basketball`,
      detail: $localize`:@@aboutHobbyBasketballDetail:Point guard, since 2016`,
    },
    {
      name: $localize`:@@aboutHobbyTaekwondo:Taekwondo`,
      detail: $localize`:@@aboutHobbyTaekwondoDetail:Yellow belt, since 2022`,
    },
    { name: $localize`:@@aboutHobbyChess:Chess`, detail: $localize`:@@aboutHobbyChessDetail:400 Elo` },
    {
      name: $localize`:@@aboutHobbyTeaching:Teaching`,
      detail: $localize`:@@aboutHobbyTeachingDetail:Maths, physics and chemistry tutor`,
    },
  ];

  readonly downloadCV = downloadCV;
}
