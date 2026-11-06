import { Project } from '../interfaces/project.interface';
import { splitPeriod } from './project-period';

/** The project text a page shows, in the page's language where a translation exists. */
export interface ProjectText {
  /** Description without its "Period:" line. */
  description: string;
  /** From the English description (the French text has no period line), formatted for the locale. */
  period: string | null;
  challenges: string;
  whatILearned: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Feb 2024" becomes "févr. 2024" in French; year ranges pass through unchanged. */
export function formatPeriod(period: string, locale: string): string {
  const match = /^([A-Z][a-z]{2})\.? (\d{4})$/.exec(period.trim());
  const month = match ? MONTHS.indexOf(match[1]) : -1;
  if (!match || month === -1) return period;
  const date = new Date(Date.UTC(Number(match[2]), month, 1));
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function pick(english: string | null | undefined, french: string | null | undefined, isFrench: boolean): string {
  const fr = french?.trim();
  return isFrench && fr ? fr : (english?.trim() ?? '');
}

/**
 * Picks the French text on the French site when the project has it, and the
 * English text otherwise, field by field.
 */
export function projectText(project: Project, locale: string): ProjectText {
  const isFrench = locale.startsWith('fr');
  const english = splitPeriod(project.description);
  const description = isFrench && project.descriptionFr?.trim() ? splitPeriod(project.descriptionFr).body : english.body;
  return {
    description,
    period: english.period && formatPeriod(english.period, locale),
    challenges: pick(project.challenges, project.challengesFr, isFrench),
    whatILearned: pick(project.whatILearned, project.whatILearnedFr, isFrench),
  };
}
