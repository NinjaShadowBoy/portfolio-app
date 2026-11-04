import { Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { PRICING_AS_OF } from './ai-cost-calculator/llm-pricing.data';

/**
 * Tools index page: the `/tools` landing that lists the site's free,
 * client-side developer tools. Fully static, so SEO is set once in the
 * constructor (baked into the prerendered HTML) and cleared on destroy.
 */
@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.css'],
})
export class ToolsComponent {
  /** Date the pricing table was last verified; shown so stale data is self-disclosing. */
  readonly pricingAsOf = PRICING_AS_OF;

  constructor() {
    const seo = inject(SeoService);
    seo.setPage({
      title: $localize`:@@toolsSeoTitle:Developer Tools · Alex Abena`,
      description: $localize`:@@toolsSeoDescription:Free developer tools that run in your browser. Compare LLM API pricing across OpenAI, Anthropic, Google and four other providers with the AI cost calculator.`,
      path: '/tools',
    });
    inject(DestroyRef).onDestroy(() => seo.clear());
  }
}
