export const CV_PATHS = {
  en: 'assets/docs/Alex_Abena_cv-en.pdf',
  fr: 'assets/docs/Alex_Abena_cv-fr.pdf',
} as const;

export function downloadCV(lang: keyof typeof CV_PATHS): void {
  const path = CV_PATHS[lang];
  const link = document.createElement('a');
  link.href = path;
  link.download = path.slice(path.lastIndexOf('/') + 1);
  link.click();
}
