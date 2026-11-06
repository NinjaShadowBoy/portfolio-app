import { Component } from '@angular/core';
import { downloadCV } from '../../core/constants/cv';
import { IconCloudComponent } from '../../shared/ui/icon-cloud/icon-cloud.component';
import { CloudEntry } from '../../shared/ui/icon-cloud/icon-cloud.layout';
import { FlagComponent } from '../../shared/ui/flag/flag.component';

@Component({
  selector: 'app-about',
  imports: [IconCloudComponent, FlagComponent],
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

  // Usage level per technology: 3 daily, 2 regularly, 1 occasionally. Drives logo size in the cloud.
  // The first four groups sit on one row on desktop and describe the AI engineering profile.
  readonly techCategories: { title: string; technologies: CloudEntry[] }[] = [
    {
      title: $localize`:@@aboutTechAi:AI & LLMs`,
      technologies: [
        { name: 'RAG', level: 3 },
        { name: 'Claude', level: 3 },
        { name: 'LangChain', level: 2 },
        { name: 'OpenRouter', level: 2 },
        { name: 'ChatGPT', level: 2 },
      ],
    },
    {
      title: $localize`:@@aboutTechBackend:Backend`,
      technologies: [
        { name: 'Spring Boot', level: 3 },
        { name: 'Gin', level: 3 },
        { name: 'NestJS', level: 2 },
        { name: 'Ktor', level: 2 },
        { name: 'Node.js', level: 2 },
        { name: 'Hibernate', level: 1 },
        { name: 'Chi', level: 1 },
        { name: 'SDL', level: 1 },
        { name: 'Arduino', level: 1 },
      ],
    },
    {
      title: $localize`:@@aboutTechLanguages:Languages`,
      technologies: [
        { name: 'Java', level: 3 },
        { name: 'Python', level: 2 },
        { name: 'TypeScript', level: 2 },
        { name: 'Go', level: 2 },
        { name: 'Kotlin', level: 2 },
        { name: 'JavaScript', level: 2 },
        { name: 'C', level: 1 },
        { name: 'C++', level: 1 },
      ],
    },
    {
      title: $localize`:@@aboutTechCloud:Cloud & DevOps`,
      technologies: [
        { name: 'Docker', level: 3 },
        { name: 'Git', level: 3 },
        { name: 'AWS', level: 2 },
        { name: 'Kubernetes', level: 2 },
        { name: 'Linux', level: 1 },
      ],
    },
    {
      title: $localize`:@@aboutTechFrontend:Frontend`,
      technologies: [
        { name: 'Angular', level: 3 },
        { name: 'Nuxt', level: 3 },
        { name: 'React', level: 2 },
        { name: 'TailwindCSS', level: 2 },
        { name: 'Next.js', level: 1 },
        { name: 'Bootstrap', level: 1 },
      ],
    },
    {
      title: $localize`:@@aboutTechDatabases:Databases`,
      technologies: [
        { name: 'PostgreSQL', level: 3 },
        { name: 'MySQL', level: 2 },
        { name: 'SQLite', level: 2 },
        { name: 'MongoDB', level: 1 },
      ],
    },
    {
      title: $localize`:@@aboutTechMobile:Mobile`,
      technologies: [
        { name: 'Expo React Native', level: 3 },
        { name: 'Jetpack Compose', level: 2 },
      ],
    },
    {
      title: $localize`:@@aboutTechTesting:Testing`,
      technologies: [
        { name: 'Playwright', level: 3 },
        { name: 'Karma', level: 1 },
        { name: 'Jasmine', level: 1 },
      ],
    },
    {
      title: $localize`:@@aboutTechTools:Tools`,
      technologies: [
        { name: 'npm', level: 2 },
        { name: 'Gradle', level: 2 },
        { name: 'Maven', level: 1 },
        { name: 'Stripe', level: 1 },
      ],
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
