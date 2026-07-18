// Build-time content pipeline for the technical writing system (task BP2).
//
// Walks src/content/articles/<slug>/{en,fr}.md, parses YAML frontmatter, renders
// Markdown to HTML with build-time Shiki syntax highlighting (dual light/dark
// themes via CSS variables so no highlighter ships to the browser), extracts a
// table-of-contents tree from heading anchors, computes reading time, and emits:
//
//   src/generated/articles-manifest.ts        -> export const articlesManifest: ArticleSummary[]
//   src/generated/articles/<slug>.<lang>.json -> per-article ArticlePayload (html + toc)
//   src/generated/public/sitemap.xml          -> published article routes + hreflang alternates
//   src/generated/public/rss.xml              -> published article feed
//
// Drafts (frontmatter `draft: true`) are excluded from every output. A missing
// French translation still emits an `fr` payload that reuses the English body and
// is flagged `notTranslated`, so the /fr route renders instead of 404-ing.
//
// Run: node scripts/build-content.mjs  (chained before `ng build` via package.json)

import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import * as shiki from 'shiki';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const contentDir = path.join(repoRoot, 'src', 'content', 'articles');
const generatedDir = path.join(repoRoot, 'src', 'generated');
const articlesOutDir = path.join(generatedDir, 'articles');
const publicOutDir = path.join(generatedDir, 'public');

const SITE_URL = 'https://www.alexabena.me';
// Static app routes emitted into the sitemap ahead of the article entries.
// '' is the home page. Bare (en) paths only — the /fr alternate is derived.
// No <lastmod>: these pages have no meaningful modification date.
const STATIC_ROUTES = ['', 'projects', 'about', 'contact', 'articles', 'tools', 'tools/ai-cost-calculator'];
const LANGS = ['en', 'fr'];
const WORDS_PER_MINUTE = 200;
const SHIKI_LANGS = [
  'typescript', 'tsx', 'javascript', 'jsx', 'bash', 'shell', 'json', 'yaml',
  'html', 'css', 'go', 'rust', 'sql', 'python', 'markdown', 'text',
];

// --------------------------------------------------------------------------
// Shiki highlighter (created once; reused synchronously inside markdown-it)
// --------------------------------------------------------------------------
const createHighlighter = shiki.createHighlighter ?? shiki.getHighlighter;
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: SHIKI_LANGS,
});
const loadedLangs = new Set(highlighter.getLoadedLanguages());

/** Highlight a fenced code block, or return '' so markdown-it uses its default. */
function highlightCode(code, lang) {
  const requested = (lang || '').toLowerCase().trim();
  const language = loadedLangs.has(requested) ? requested : 'text';
  try {
    return highlighter.codeToHtml(code, {
      lang: language,
      themes: { light: 'github-light', dark: 'github-dark' },
      // Emit only --shiki-light / --shiki-dark CSS variables (no default color)
      // so styles.css can map highlighting onto [data-theme] automatically.
      defaultColor: false,
    });
  } catch {
    return '';
  }
}

// --------------------------------------------------------------------------
// Markdown -> HTML with anchored headings
// --------------------------------------------------------------------------
/** Lowercase, strip punctuation, dash-join: "Introduction" -> "introduction". */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function createMarkdown() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight: (code, lang) => highlightCode(code, lang),
  });
  md.use(anchor, { level: [2, 3, 4], slugify });
  return md;
}

/** Build a nested TOC tree from the flat heading list emitted during parse. */
function extractToc(md, markdown) {
  const tokens = md.parse(markdown, {});
  const flat = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'heading_open') continue;
    const level = Number(token.tag.slice(1));
    if (level < 2 || level > 4) continue;
    const inline = tokens[i + 1];
    const text = inline && inline.type === 'inline' ? inline.content : '';
    const id = token.attrGet('id') || slugify(text);
    flat.push({ id, text, level });
  }

  const root = [];
  const stack = [];
  for (const heading of flat) {
    const node = { ...heading, children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else root.push(node);
    stack.push(node);
  }
  return root;
}

function readingTimeOf(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// --------------------------------------------------------------------------
// Frontmatter helpers
// --------------------------------------------------------------------------
/** YAML parses unquoted dates to Date objects; normalise to YYYY-MM-DD. */
function toISODate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeConnections(raw = {}) {
  const conn = {
    relatedArticles: Array.isArray(raw.relatedArticles) ? raw.relatedArticles : [],
    relatedProjects: Array.isArray(raw.relatedProjects) ? raw.relatedProjects : [],
    researchPapers: Array.isArray(raw.researchPapers)
      ? raw.researchPapers.map((p) => ({
          title: p.title,
          url: p.url,
          ...(p.authors ? { authors: p.authors } : {}),
        }))
      : [],
  };
  if (raw.linkedInUrl) conn.linkedInUrl = raw.linkedInUrl;
  return conn;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// --------------------------------------------------------------------------
// Build
// --------------------------------------------------------------------------
function build() {
  if (!existsSync(contentDir)) {
    console.warn(`[build-content] no content directory at ${contentDir}; nothing to build.`);
  }

  // Clean + recreate the generated tree so removed articles never linger.
  rmSync(generatedDir, { recursive: true, force: true });
  mkdirSync(articlesOutDir, { recursive: true });
  mkdirSync(publicOutDir, { recursive: true });

  const slugs = existsSync(contentDir)
    ? readdirSync(contentDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  const manifest = [];

  for (const slug of slugs) {
    const slugDir = path.join(contentDir, slug);
    const enPath = path.join(slugDir, 'en.md');
    if (!existsSync(enPath)) {
      console.warn(`[build-content] skipping "${slug}": no en.md`);
      continue;
    }

    const enFile = matter(readFileSync(enPath, 'utf8'));
    if (enFile.data.draft === true) {
      continue; // drafts excluded from manifest, payloads, sitemap, rss
    }

    const langs = ['en'];
    if (existsSync(path.join(slugDir, 'fr.md'))) langs.push('fr');

    // Manifest row (lean; no body). Built from the English frontmatter.
    const meta = enFile.data;
    manifest.push({
      slug,
      title: meta.title,
      description: meta.description,
      date: toISODate(meta.date),
      ...(meta.updated ? { updated: toISODate(meta.updated) } : {}),
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      ...(meta.coverImage ? { coverImage: meta.coverImage } : {}),
      readingTime: readingTimeOf(enFile.content),
      langs,
      connections: normalizeConnections(meta.connections),
    });

    // Per-locale payloads. Every published slug emits BOTH en + fr so the
    // per-locale build always has content; a missing fr reuses the en body.
    for (const lang of LANGS) {
      const hasOwn = existsSync(path.join(slugDir, `${lang}.md`));
      const source = hasOwn
        ? matter(readFileSync(path.join(slugDir, `${lang}.md`), 'utf8'))
        : enFile;
      const notTranslated = !hasOwn;

      const md = createMarkdown();
      const html = md.render(source.content);
      const toc = extractToc(md, source.content);

      const payload = {
        slug,
        lang,
        title: source.data.title ?? meta.title,
        description: source.data.description ?? meta.description,
        html,
        toc,
        notTranslated,
      };
      writeFileSync(
        path.join(articlesOutDir, `${slug}.${lang}.json`),
        JSON.stringify(payload),
      );
    }
  }

  // Newest-first.
  manifest.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  writeManifest(manifest);
  writeSitemap(manifest);
  writeRss(manifest);

  console.log(
    `[build-content] ${manifest.length} article(s) built -> ${path.relative(repoRoot, generatedDir)}`,
  );
}

function writeManifest(manifest) {
  const body =
    '// AUTO-GENERATED by scripts/build-content.mjs — do not edit by hand.\n' +
    "import { ArticleSummary } from '../app/core/interfaces/article.interface';\n\n" +
    `export const articlesManifest: ArticleSummary[] = ${JSON.stringify(manifest, null, 2)};\n`;
  writeFileSync(path.join(generatedDir, 'articles-manifest.ts'), body);
}

function writeSitemap(manifest) {
  // Static routes first. Every static route exists in both locale builds, so
  // en + fr + x-default alternates are emitted unconditionally, matching the
  // alternate format used for articles below.
  const staticUrls = STATIC_ROUTES.map((route) => {
    const enHref = route ? `${SITE_URL}/${route}` : SITE_URL;
    const frHref = route ? `${SITE_URL}/fr/${route}` : `${SITE_URL}/fr`;
    return [
      '  <url>',
      `    <loc>${enHref}</loc>`,
      `      <xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>`,
      `      <xhtml:link rel="alternate" hreflang="x-default" href="${enHref}"/>`,
      `      <xhtml:link rel="alternate" hreflang="fr" href="${frHref}"/>`,
      '  </url>',
    ].join('\n');
  });

  const urls = manifest
    .map((a) => {
      const enHref = `${SITE_URL}/articles/${a.slug}`;
      const alternates = [
        `      <xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>`,
        `      <xhtml:link rel="alternate" hreflang="x-default" href="${enHref}"/>`,
      ];
      if (a.langs.includes('fr')) {
        alternates.push(
          `      <xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}/fr/articles/${a.slug}"/>`,
        );
      }
      return [
        '  <url>',
        `    <loc>${enHref}</loc>`,
        `    <lastmod>${a.updated || a.date}</lastmod>`,
        ...alternates,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${[...staticUrls, urls].filter(Boolean).join('\n')}\n` +
    '</urlset>\n';
  writeFileSync(path.join(publicOutDir, 'sitemap.xml'), xml);
}

function writeRss(manifest) {
  const items = manifest
    .map((a) => {
      const link = `${SITE_URL}/articles/${a.slug}`;
      return [
        '    <item>',
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <description>${escapeXml(a.description)}</description>`,
        `      <pubDate>${new Date(a.date).toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    '    <title>Alex Abena — Articles</title>\n' +
    `    <link>${SITE_URL}/articles</link>\n` +
    '    <description>Technical writing on AI, Rust, ERP systems, cloud infrastructure, and full-stack development.</description>\n' +
    `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n` +
    `${items}\n` +
    '  </channel>\n' +
    '</rss>\n';
  writeFileSync(path.join(publicOutDir, 'rss.xml'), xml);
}

build();
