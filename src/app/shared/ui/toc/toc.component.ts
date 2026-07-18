import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * A single node of the article table-of-contents tree.
 * Emitted by the build-time content compiler (heading anchors -> nested tree)
 * and consumed by the article detail payload. Defined here so the shared
 * component owns its contract; RT5's ArticlePayload re-uses this shape.
 */
export interface TocNode {
  /** Heading anchor id (matches the `id` injected on the rendered heading). */
  id: string;
  /** Visible heading text. */
  text: string;
  /** Heading level (2 = h2, 3 = h3, ...). */
  level: number;
  /** Nested sub-headings, if any. */
  children?: TocNode[];
}

@Component({
  selector: 'app-toc',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './toc.component.html',
  styleUrls: ['./toc.component.css'],
})
export class TocComponent {
  private destroyRef = inject(DestroyRef);

  /** The table-of-contents tree from the article payload. */
  nodes = input<TocNode[]>([]);

  /** Id of the heading currently in view (scroll-spy). */
  readonly activeId = signal<string | null>(null);

  /** True when there is at least one entry to render. */
  readonly hasNodes = computed(() => this.nodes().length > 0);

  constructor() {
    // afterNextRender only runs in the browser, so scroll-spy is SSR-safe and
    // never touches the DOM during prerender.
    afterNextRender(() => this.setupScrollSpy());
  }

  private setupScrollSpy(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const ids = this.collectIds(this.nodes());
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) {
      return;
    }

    // A heading counts as "active" once it crosses into the top third of the
    // viewport. Purely an observation of scroll position — no animation, so it
    // is unaffected by prefers-reduced-motion (smooth scrolling is handled by
    // the router's anchorScrolling, which the global reset already neutralises).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeId.set((entry.target as HTMLElement).id);
          }
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );

    headings.forEach((el) => observer.observe(el));
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Flattens the tree into the list of anchor ids to observe. */
  private collectIds(nodes: TocNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children?.length) {
        ids.push(...this.collectIds(node.children));
      }
    }
    return ids;
  }
}
