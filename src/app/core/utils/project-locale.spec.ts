import { Project } from '../interfaces/project.interface';
import { formatPeriod, projectText } from './project-locale';

const base = {
  description: 'Built it.\n\nPeriod: Feb 2024.',
  challenges: 'Hard part.',
  whatILearned: 'Lesson.',
} as Project;

describe('projectText', () => {
  it('uses the English text on the English site', () => {
    expect(projectText({ ...base, descriptionFr: 'Construit.' }, 'en-US')).toEqual({
      description: 'Built it.',
      period: 'Feb 2024',
      challenges: 'Hard part.',
      whatILearned: 'Lesson.',
    });
  });

  it('uses each French field that exists and falls back field by field', () => {
    const text = projectText({ ...base, descriptionFr: 'Construit.', challengesFr: '  ', whatILearnedFr: 'Leçon.' }, 'fr');
    expect(text.description).toBe('Construit.');
    expect(text.challenges).toBe('Hard part.');
    expect(text.whatILearned).toBe('Leçon.');
  });

  it('keeps the period from the English description on the French site', () => {
    expect(projectText({ ...base, descriptionFr: 'Construit.' }, 'fr').period).toBe(formatPeriod('Feb 2024', 'fr'));
  });
});

describe('formatPeriod', () => {
  it('formats a month and year for the locale', () => {
    expect(formatPeriod('Feb 2024', 'fr')).toMatch(/févr\.? 2024/);
    expect(formatPeriod('Feb 2024', 'en-US')).toBe('Feb 2024');
  });

  it('leaves year ranges alone', () => {
    expect(formatPeriod('2023 - 2024', 'fr')).toBe('2023 - 2024');
  });
});
