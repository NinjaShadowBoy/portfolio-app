import { Component, inject } from '@angular/core';
import { TechnologiesService, Technology } from '../../core/services/technologies.service';
import { downloadCV } from '../../core/constants/cv';
import { TechBannerComponent } from '../../shared/ui/tech-banner/tech-banner.component';
import { FlagComponent } from '../../shared/ui/flag/flag.component';

interface TechCategory {
  title: string;
  technologies: Technology[];
  direction: 'left' | 'right';
}

/** [technology name, proficiency]. Whole numbers = proficient, .5 = only tried. */
type Rated = [string, number];

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TechBannerComponent, FlagComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  private techService = inject(TechnologiesService);

  readonly skills = [
    $localize`:@@aboutSkillBackend:Backend & APIs`,
    $localize`:@@aboutSkillAi:AI & LLM integration`,
    $localize`:@@aboutSkillWeb:Full-stack web`,
    $localize`:@@aboutSkillMobile:Mobile`,
  ];

  // Banners alternate direction so neighbouring rows scroll opposite ways.
  readonly techCategories: TechCategory[] = [
    this.category('Languages', [
      ['TypeScript', 3], ['JavaScript', 3], ['Java', 3], ['Kotlin', 2], ['Python', 3],
      ['Go', 3], ['C', 2.5], ['C++', 2.5], ['HTML5', 3.5], ['CSS3', 3.5],
    ]),
    this.category('Frontend', [
      ['Angular', 3], ['Nuxt', 2], ['React', 2], ['Next.js', 1.5], ['TailwindCSS', 2.5], ['Bootstrap', 2.5],
    ]),
    this.category('Backend', [
      ['Spring Boot', 3], ['NestJS', 3], ['Gin', 3], ['Ktor', 1.5], ['Node.js', 0], ['Hibernate', 0],
      ['Chi', 1], ['SDL', 2], ['Arduino', 3.5],
    ]),
    this.category('Databases', [['PostgreSQL', 2], ['MySQL', 3.5], ['MongoDB', 1.5], ['SQLite', 1]]),
    this.category('Mobile', [['Expo React Native', 2], ['Jetpack Compose', 1.5]]),
    this.category('Testing', [['Karma', 0], ['Jasmine', 0], ['Playwright', 3]]),
    this.category('DevOps & Tools', [
      ['Git', 3], ['Docker', 2], ['Linux', 2], ['npm', 3], ['Gradle', 1], ['Maven', 1],
      ['Stripe', 0], ['ChatGPT', 2],
    ]),
  ].map((category, i) => ({ ...category, direction: i % 2 ? 'right' : 'left' }));

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

  private category(title: string, rated: Rated[]): Omit<TechCategory, 'direction'> {
    const technologies = rated
      .map(([name, proficiency]) => this.techService.getTechnology(name, proficiency))
      .filter((tech) => tech !== undefined);
    return { title, technologies };
  }
}
