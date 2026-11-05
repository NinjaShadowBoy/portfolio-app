import { Component, DestroyRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TocNode } from '../../../core/interfaces/article.interface';

@Component({
  selector: 'app-toc',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './toc.component.html',
  styleUrl: './toc.component.css',
})
export class TocComponent {
  private destroyRef = inject(DestroyRef);

  /** The table-of-contents tree from the article payload. */
  nodes = input<TocNode[]>([]);

  /** Id of the heading currently in view (scroll-spy). */
  readonly activeId = signal<string | null>(null);

  readonly hasNodes = computed(() => this.nodes().length > 0);

  constructor() {
    // afterNextRender only runs in the browser, so scroll-spy is SSR-safe.
    afterNextRender(() => this.setupScrollSpy());
  }

  private setupScrollSpy(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const headings = this.collectIds(this.nodes())
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // A heading is "active" once it crosses into the top third of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.activeId.set((entry.target as HTMLElement).id);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((el) => observer.observe(el));
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private collectIds(nodes: TocNode[]): string[] {
    return nodes.flatMap((node) => [node.id, ...this.collectIds(node.children ?? [])]);
  }
}
