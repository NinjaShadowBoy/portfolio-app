/**
 * The tiny Markdown subset the assistant's answers use, parsed into data the
 * template renders with normal Angular bindings. Nothing here produces HTML,
 * so raw markup, images and unknown URLs stay text.
 */
export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  /** Site path for a routerLink (the build's base href adds the locale). */
  routerLink?: string;
  /** Absolute URL for a plain anchor (PDF or allowed external site). */
  href?: string;
  /** File name for a same-origin PDF the anchor downloads. */
  download?: string;
}

export type ChatBlock =
  | { kind: 'paragraph'; runs: InlineRun[] }
  | { kind: 'list'; ordered: boolean; items: InlineRun[][] };

export interface LinkTarget {
  routerLink?: string;
  href?: string;
  external: boolean;
  /** File name when the link downloads a site PDF. */
  download?: string;
}

const INTERNAL_ROUTES = [
  /^\/home$/,
  /^\/projects\/\d+$/,
  /^\/publications(?:\/[a-z0-9-]+)?$/,
  /^\/about$/,
  /^\/contact$/,
  /^\/tools$/,
  /^\/tools\/ai-cost-calculator$/,
  /^\/privacy$/,
];

/** Site PDFs: the papers in public/papers and the two CVs in src/assets/docs. */
const PDF_PATH = /^\/(?:papers\/[\w.-]+|assets\/docs\/Alex_Abena_cv-(?:en|fr))\.pdf$/i;

const EXTERNAL_HOSTS = new Set(['github.com', 'gitlab.com', 'linkedin.com']);

/**
 * Decides how a URL may be rendered: an internal routerLink, a new-tab anchor,
 * or nothing (the caller shows plain text instead). External URLs pass only
 * when the API returned them in a links event or they are a profile host.
 */
export function classifyLink(raw: string, allowed: ReadonlySet<string>): LinkTarget | null {
  const url = raw.trim();
  if (PDF_PATH.test(url)) return { href: url, external: true, download: url.slice(url.lastIndexOf('/') + 1) };
  if (INTERNAL_ROUTES.some((route) => route.test(url))) return { routerLink: url, external: false };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null; // relative or malformed
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.replace(/^www\./, '');
  if (!allowed.has(url) && !EXTERNAL_HOSTS.has(host)) return null;
  return { href: url, external: true };
}

interface Style {
  bold?: boolean;
  italic?: boolean;
}

function parseInline(text: string, allowed: ReadonlySet<string>, style: Style = {}): InlineRun[] {
  const runs: InlineRun[] = [];
  let plain = '';

  const flush = () => {
    if (plain) {
      runs.push({ text: plain, ...style });
      plain = '';
    }
  };

  for (let i = 0; i < text.length; ) {
    if (text.startsWith('`', i)) {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        flush();
        runs.push({ text: text.slice(i + 1, end), ...style, code: true });
        i = end + 1;
        continue;
      }
    }

    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > i) {
        flush();
        runs.push(...parseInline(text.slice(i + 2, end), allowed, { ...style, bold: true }));
        i = end + 2;
        continue;
      }
    }

    if (text.startsWith('*', i)) {
      const end = text.indexOf('*', i + 1);
      if (end > i) {
        flush();
        runs.push(...parseInline(text.slice(i + 1, end), allowed, { ...style, italic: true }));
        i = end + 1;
        continue;
      }
    }

    if (text.startsWith('![', i)) {
      // Images are never loaded; only their alt text is kept.
      const image = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(text.slice(i));
      if (image) {
        flush();
        if (image[1]) runs.push({ text: image[1], ...style });
        i += image[0].length;
        continue;
      }
    }

    if (text.startsWith('[', i)) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(text.slice(i));
      if (link) {
        flush();
        const target = classifyLink(link[2], allowed);
        // A rejected URL keeps its label but loses the link.
        runs.push({ text: link[1], ...style, routerLink: target?.routerLink, href: target?.href, download: target?.download });
        i += link[0].length;
        continue;
      }
    }

    plain += text[i];
    i++;
  }

  flush();
  return runs;
}

/** Paragraphs plus flat bullet and numbered lists. */
export function parseBlocks(text: string, allowed: ReadonlySet<string>): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: 'paragraph', runs: parseInline(paragraph.join(' '), allowed) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({
      kind: 'list',
      ordered: list.ordered,
      items: list.items.map((item) => parseInline(item, allowed)),
    });
    list = null;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
