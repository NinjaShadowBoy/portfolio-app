import { Component, computed, input } from '@angular/core';

/** Trimmed URL, or null when the value is missing or blank. */
export function presentLink(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

/** Label of a repository link, from its host. */
export function repoHost(url: string): 'GitHub' | 'GitLab' | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (host === 'gitlab.com' || host.endsWith('.gitlab.com')) return 'GitLab';
  if (host === 'github.com' || host.endsWith('.github.com')) return 'GitHub';
  return null;
}

/**
 * Repository, live-site and paper links for a project. Each link renders only when its
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
  /** Site-relative path of a paper PDF about the project. */
  paperLink = input<string | null | undefined>(null);
  /** Used in the accessible names, so a list of cards has distinct links. */
  projectName = input.required<string>();
  variant = input<'compact' | 'prominent'>('compact');

  readonly github = computed(() => presentLink(this.githubLink()));
  readonly demo = computed(() => presentLink(this.demoLink()));
  readonly paper = computed(() => presentLink(this.paperLink()));
  /** "GitLab" for gitlab.com URLs; the field is called githubLink but holds any repository. */
  readonly repoLabel = computed(() => {
    const url = this.github();
    return url && repoHost(url) === 'GitLab' ? 'GitLab' : 'GitHub';
  });
  readonly paperAria = computed(
    () => $localize`:Project links paper accessible name@@projectLinksPaperAria:${this.projectName()}:INTERPOLATION: paper (PDF, opens in a new tab)`
  );
  readonly githubAria = computed(
    () => $localize`:Project links repository accessible name@@projectLinksRepoAria:${this.projectName()}:INTERPOLATION: on ${this.repoLabel()}:HOST: (opens in a new tab)`
  );
  readonly demoAria = computed(
    () => $localize`:Project links live site accessible name@@projectLinksDemoAria:${this.projectName()}:INTERPOLATION: live site (opens in a new tab)`
  );
}
