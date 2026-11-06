import { Component, computed, input } from '@angular/core';

/** Trimmed URL, or null when the value is missing or blank. */
export function presentLink(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

/**
 * GitHub and live-site links for a project. Each link renders only when its
 * URL is present; with neither, the component renders nothing. `compact` is
 * the small icon+label row on project cards, `prominent` the button pair on
 * the project detail page.
 */
@Component({
  selector: 'app-project-links',
  templateUrl: './project-links.component.html',
  styleUrl: './project-links.component.css',
  host: { '[class.prominent]': 'variant() === "prominent"' },
})
export class ProjectLinksComponent {
  githubLink = input<string | null | undefined>(null);
  demoLink = input<string | null | undefined>(null);
  /** Used in the accessible names, so a list of cards has distinct links. */
  projectName = input.required<string>();
  variant = input<'compact' | 'prominent'>('compact');

  readonly github = computed(() => presentLink(this.githubLink()));
  readonly demo = computed(() => presentLink(this.demoLink()));
  readonly githubAria = computed(
    () => $localize`:Project links GitHub accessible name@@projectLinksGithubAria:${this.projectName()}:INTERPOLATION: on GitHub (opens in a new tab)`
  );
  readonly demoAria = computed(
    () => $localize`:Project links live site accessible name@@projectLinksDemoAria:${this.projectName()}:INTERPOLATION: live site (opens in a new tab)`
  );
}
