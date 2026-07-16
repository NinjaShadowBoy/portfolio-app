import { Injectable } from '@angular/core';

export interface Technology {
  name: string;
  logo: string; // URL to logo
  docUrl: string; // Link to official documentation
  proficiency?: number; // Optional proficiency level (0-3); 0/1 = exposed, 2/3 = proficient
}

@Injectable({
  providedIn: 'root',
})
export class TechnologiesService {
  // Single source of truth for all technologies/tools and their official documentation + logos
  private readonly technologies: Record<string, Technology> = {
    'typescript': {
      name: 'TypeScript',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
      docUrl: 'https://www.typescriptlang.org/',
    },
    'javascript': {
      name: 'JavaScript',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
      docUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    },
    'java': {
      name: 'Java',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
      docUrl: 'https://dev.java/',
    },
    'kotlin': {
      name: 'Kotlin',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
      docUrl: 'https://kotlinlang.org/',
    },
    'python': {
      name: 'Python',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
      docUrl: 'https://www.python.org/',
    },
    'c': {
      name: 'C',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg',
      docUrl: 'https://en.cppreference.com/w/c',
    },
    'c++': {
      name: 'C++',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
      docUrl: 'https://isocpp.org/',
    },
    'html5': {
      name: 'HTML5',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
      docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    },
    'html': {
      name: 'HTML5',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
      docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    },
    'css3': {
      name: 'CSS3',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
      docUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    },
    'css': {
      name: 'CSS3',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
      docUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    },
    'angular': {
      name: 'Angular',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angular/angular-original.svg',
      docUrl: 'https://angular.dev/',
    },
    'react': {
      name: 'React',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
      docUrl: 'https://react.dev/',
    },
    'expo react native': {
      name: 'Expo React Native',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/expo/expo-original.svg',
      docUrl: 'https://expo.dev/',
    },
    'spring boot': {
      name: 'Spring Boot',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
      docUrl: 'https://spring.io/projects/spring-boot',
    },
    'spring': {
      name: 'Spring',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
      docUrl: 'https://spring.io/',
    },
    'nestjs': {
      name: 'NestJS',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-original.svg',
      docUrl: 'https://nestjs.com/',
    },
    'ktor': {
      name: 'Ktor',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ktor/ktor-original.svg',
      docUrl: 'https://ktor.io/',
    },
    'gin': {
      name: 'Gin',
      logo: 'https://gin-gonic.com/_astro/gin.D6H2T_2v_hOrNd.webp',
      docUrl: 'https://gin-gonic.com/',
    },
    'nuxt': {
      name: 'Nuxt',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nuxtjs/nuxtjs-original.svg',
      docUrl: 'https://nuxt.com/',
    },
    'jetpack compose': {
      name: 'Jetpack Compose',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jetpackcompose/jetpackcompose-original.svg',
      docUrl: 'https://developer.android.com/jetpack/compose',
    },
    'git': {
      name: 'Git',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
      docUrl: 'https://git-scm.com/',
    },
    'docker': {
      name: 'Docker',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
      docUrl: 'https://www.docker.com/',
    },
    'postgresql': {
      name: 'PostgreSQL',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
      docUrl: 'https://www.postgresql.org/',
    },
    'mysql': {
      name: 'MySQL',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
      docUrl: 'https://www.mysql.com/',
    },
    'sqlite': {
      name: 'SQLite',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg',
      docUrl: 'https://www.sqlite.org/',
    },
    'mongodb': {
      name: 'MongoDB',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
      docUrl: 'https://www.mongodb.com/',
    },
    'chatgpt': {
      name: 'ChatGPT',
      logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openai.svg',
      docUrl: 'https://openai.com/chatgpt',
    },
    'openai': {
      name: 'OpenAI',
      logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openai.svg',
      docUrl: 'https://openai.com/',
    },
    'linux': {
      name: 'Linux',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg',
      docUrl: 'https://www.linux.org/',
    },
    'gradle': {
      name: 'Gradle',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gradle/gradle-original.svg',
      docUrl: 'https://gradle.org/',
    },
    'maven': {
      name: 'Maven',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/maven/maven-original.svg',
      docUrl: 'https://maven.apache.org/',
    },
    'npm': {
      name: 'npm',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/npm/npm-original-wordmark.svg',
      docUrl: 'https://www.npmjs.com/',
    },
    'stripe': {
      name: 'Stripe',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/stripe/stripe-original.svg',
      docUrl: 'https://stripe.com/',
    },
    'hibernate': {
      name: 'Hibernate',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/hibernate/hibernate-original.svg',
      docUrl: 'https://hibernate.org/',
    },
    'karma': {
      name: 'Karma',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/karma/karma-original.svg',
      docUrl: 'https://karma-runner.github.io/',
    },
    'jasmine': {
      name: 'Jasmine',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jasmine/jasmine-original.svg',
      docUrl: 'https://jasmine.github.io/',
    },
    'nodejs': {
      name: 'Node.js',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
      docUrl: 'https://nodejs.org/',
    },
    'node.js': {
      name: 'Node.js',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
      docUrl: 'https://nodejs.org/',
    },
    'node': {
      name: 'Node.js',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
      docUrl: 'https://nodejs.org/',
    },
    'tailwindcss': {
      name: 'TailwindCSS',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg',
      docUrl: 'https://tailwindcss.com/',
    },
    'tailwind': {
      name: 'TailwindCSS',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg',
      docUrl: 'https://tailwindcss.com/',
    },
    'bootstrap': {
      name: 'Bootstrap',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg',
      docUrl: 'https://getbootstrap.com/',
    },
    'next.js': {
      name: 'Next.js',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg',
      docUrl: 'https://nextjs.org/',
    },
    'go': {
      name: 'Go',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg',
      docUrl: 'https://golang.org/',
    },
    'chi': {
      name: 'Chi',
      logo: 'https://cdn.rawgit.com/go-chi/chi/master/_examples/chi.svg',
      docUrl: 'https://go-chi.io/',
    },
    'sdl': {
      name: 'SDL',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sdl/sdl-original.svg',
      docUrl: 'https://www.libsdl.org/',
    },
    'arduino': {
      name: 'Arduino',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/arduino/arduino-original.svg',
      docUrl: 'https://www.arduino.cc/',
    },
    'playwright': {
      name: 'Playwright',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/playwright/playwright-original.svg',
      docUrl: 'https://playwright.dev/',
    },
  };

  /**
   * Look up a technology by name (case-insensitive)
   */
  getTechnology(name: string, proficiency?: number): Technology | undefined {
    const key = name.toLowerCase().trim();
    const tech = this.technologies[key];
    if (!tech) return undefined;
    if (proficiency == null) return tech;
    return { ...tech, proficiency };
  }

  /**
   * Get all defined technologies
   */
  getTechnologies(): Technology[] {
    return Object.values(this.technologies);
  }
}
