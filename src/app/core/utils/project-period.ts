/** A project description with its "Period: ..." line taken out. */
export interface SplitDescription {
  /** The text after "Period:", without the trailing full stop, or null when there is none. */
  period: string | null;
  /** The description without the period line. */
  body: string;
}

const PERIOD_LINE = /^[ \t]*Period:[ \t]*(.+?)\.?[ \t]*$/im;

/**
 * Projects store their period as a "Period: 2023 – 2024." line in the
 * description (the API has no period field). Pages show it as its own field.
 */
export function splitPeriod(description: string | null | undefined): SplitDescription {
  const text = description ?? '';
  const match = PERIOD_LINE.exec(text);
  if (!match) return { period: null, body: text.trim() };
  const body = (text.slice(0, match.index) + text.slice(match.index + match[0].length))
    .replace(/(\r?\n){3,}/g, '\n\n')
    .trim();
  return { period: match[1].trim(), body };
}
