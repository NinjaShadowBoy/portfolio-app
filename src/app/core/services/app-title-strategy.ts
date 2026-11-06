import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { AUTHOR_NAME } from './seo.service';

/** The browser title for a page called `page`, e.g. "Projects - Alex Abena". */
export function pageTitle(page: string): string {
  return `${page} - ${AUTHOR_NAME}`;
}

/** Title of pages without their own, the home page among them. */
export const SITE_TITLE = $localize`:Site title@@siteTitle:Alex Abena · Software Engineering Student`;

/**
 * Sets the document title from the route's `title`. Pages that know a better
 * title once their data loads (project and article detail, tools) set it
 * themselves afterwards.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? pageTitle(page) : SITE_TITLE);
  }
}
